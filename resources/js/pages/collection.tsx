import { Head } from '@inertiajs/react';
import { LayoutGrid, List, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BottomSheet } from '@/components/tc/bottom-sheet';
import { ChoiceRow } from '@/components/tc/choice-row';
import { Pill } from '@/components/tc/pill';
import { RestaurantCard, RestaurantRow } from '@/components/tc/restaurant-card';
import type {
    Filters,
    GoodForKey,
    OccasionKey,
    Place,
    StatusFilter,
} from '@/lib/collection';
import {
    ALL_CITIES,
    countWhere,
    defaultFilters,
    filterPlaces,
    filtersFromParams,
    filtersToQuery,
    GOOD_FOR,
    GOOD_FOR_KEYS,
    isFiltered,
    matchesStatus,
    moreCount,
    OCCASION_KEYS,
    OCCASIONS,
    parseQuery,
    STATUS_FILTERS,
    understoodLine,
} from '@/lib/collection';
import { cn } from '@/lib/utils';

type Props = {
    places: Place[];
    homeCity: string;
    initial: Record<string, string>;
};

type SheetKind = 'city' | 'occasion' | 'status' | 'more' | null;

const PAGE = 20;

function readView(): 'cards' | 'list' {
    try {
        return localStorage.getItem('tc.view') === 'list' ? 'list' : 'cards';
    } catch {
        return 'cards';
    }
}

export default function CollectionPage({ places, homeCity, initial }: Props) {
    const [filters, setFilters] = useState<Filters>(() =>
        filtersFromParams(initial, homeCity),
    );
    const [sheet, setSheet] = useState<SheetKind>(null);
    const [limit, setLimit] = useState(PAGE);
    const [view, setView] = useState<'cards' | 'list'>(readView);
    const searchRef = useRef<HTMLInputElement>(null);

    const update = (patch: Partial<Filters>) => {
        setFilters((f) => ({ ...f, ...patch }));
        setLimit(PAGE);
    };

    // Keep the URL in step so Back and sharing a link keep the filters.
    useEffect(() => {
        const url = `/collection${filtersToQuery(filters, homeCity)}`;
        window.history.replaceState(window.history.state, '', url);
    }, [filters, homeCity]);

    useEffect(() => {
        if (initial.focus && searchRef.current) {
            const input = searchRef.current;
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        }
    }, [initial.focus]);

    useEffect(() => {
        try {
            localStorage.setItem('tc.view', view);
        } catch {
            // Private mode: fine, the view just is not remembered.
        }
    }, [view]);

    const results = useMemo(
        () => filterPlaces(places, filters),
        [places, filters],
    );
    const parsed = useMemo(
        () => parseQuery(filters.q, places),
        [filters.q, places],
    );
    const understood = understoodLine(parsed);
    const cities = useMemo(
        () => [...new Set(places.map((p) => p.city))].sort(),
        [places],
    );
    const cuisines = useMemo(
        () =>
            [
                ...new Set(
                    places
                        .map((p) => p.cuisine)
                        .filter((c): c is string => !!c),
                ),
            ].sort(),
        [places],
    );
    const count = (
        skip: Parameters<typeof countWhere>[2],
        test: (p: Place) => boolean,
    ) => countWhere(places, filters, skip, test);
    const more = moreCount(filters);
    const choose = (patch: Partial<Filters>) => {
        update(patch);
        setSheet(null);
    };

    return (
        <>
            <Head title="Collection" />
            <div className="px-5 pt-3 md:px-0 md:pt-0">
                <h1 className="mb-4 font-serif text-[34px] leading-tight md:text-[36px]">
                    Collection
                </h1>

                <label className="relative block">
                    <span className="sr-only">Search</span>
                    <Search
                        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-muted"
                        strokeWidth={1.6}
                    />
                    <input
                        ref={searchRef}
                        type="search"
                        value={filters.q}
                        onChange={(e) => update({ q: e.target.value })}
                        placeholder='Try "italian lunch surry hills"'
                        className="h-[52px] w-full rounded-full border border-line-strong bg-paper pr-12 pl-12 text-base placeholder:text-ink-muted focus:border-ink focus:outline-none [&::-webkit-search-cancel-button]:hidden"
                    />
                    {filters.q && (
                        <button
                            type="button"
                            aria-label="Clear search"
                            onClick={() => update({ q: '' })}
                            className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center text-ink-muted"
                        >
                            <X className="size-5" strokeWidth={1.6} />
                        </button>
                    )}
                </label>
                {understood && (
                    <p className="mt-2 px-1 text-sm text-ink-muted">
                        Showing: <span className="text-ink">{understood}</span>
                    </p>
                )}

                {/* The four pills */}
                <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:px-0">
                    <Pill
                        chevron
                        active={filters.city !== homeCity}
                        onClick={() => setSheet('city')}
                        label="Choose city"
                    >
                        {filters.city === ALL_CITIES
                            ? 'All cities'
                            : filters.city}
                    </Pill>
                    <Pill
                        chevron
                        active={!!filters.occasion}
                        onClick={() => setSheet('occasion')}
                        label="Choose occasion"
                    >
                        {filters.occasion
                            ? OCCASIONS[filters.occasion].label
                            : 'Occasion'}
                    </Pill>
                    <Pill
                        chevron
                        active={filters.status !== 'all'}
                        onClick={() => setSheet('status')}
                        label="Choose what to show"
                    >
                        {STATUS_FILTERS[filters.status].label}
                    </Pill>
                    <Pill
                        chevron
                        active={more > 0}
                        onClick={() => setSheet('more')}
                        label="More filters"
                    >
                        {more ? `More · ${more}` : 'More'}
                    </Pill>
                </div>

                {/* Count, reset, view toggle */}
                <div className="mt-4 mb-4 flex items-center gap-3">
                    <p className="text-[15px] font-medium" aria-live="polite">
                        {results.length}{' '}
                        {results.length === 1 ? 'place' : 'places'}
                    </p>
                    {isFiltered(filters, homeCity) && (
                        <button
                            type="button"
                            onClick={() => update(defaultFilters(homeCity))}
                            className="h-11 px-2 text-[15px] font-medium text-olive underline underline-offset-4"
                        >
                            Reset
                        </button>
                    )}
                    <div
                        className="ml-auto flex gap-1"
                        role="group"
                        aria-label="View"
                    >
                        {(
                            [
                                ['cards', LayoutGrid, 'Cards'],
                                ['list', List, 'List'],
                            ] as const
                        ).map(([value, Icon, label]) => (
                            <button
                                key={value}
                                type="button"
                                aria-label={label}
                                aria-pressed={view === value}
                                onClick={() => setView(value)}
                                className={cn(
                                    'flex h-11 w-12 items-center justify-center rounded-input border transition',
                                    view === value
                                        ? 'border-ink bg-ink text-paper'
                                        : 'border-line text-ink',
                                )}
                            >
                                <Icon className="size-5" strokeWidth={1.6} />
                            </button>
                        ))}
                    </div>
                </div>

                {results.length === 0 ? (
                    <div className="rounded-card border border-dashed border-line-strong px-6 py-10 text-center">
                        <p className="font-serif text-[22px]">
                            Nothing matches
                        </p>
                        <p className="mt-1 text-[15px] text-ink-muted">
                            Try fewer words, or reset the filters.
                        </p>
                        <button
                            type="button"
                            onClick={() => update(defaultFilters(homeCity))}
                            className="mt-4 h-11 rounded-full border border-ink px-5 text-[15px] font-semibold"
                        >
                            Reset filters
                        </button>
                    </div>
                ) : view === 'cards' ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {results.slice(0, limit).map((p) => (
                            <RestaurantCard key={p.id} place={p} />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-card border border-line bg-paper px-4">
                        {results.slice(0, limit).map((p) => (
                            <RestaurantRow key={p.id} place={p} />
                        ))}
                    </div>
                )}

                {results.length > limit && (
                    <button
                        type="button"
                        onClick={() => setLimit((l) => l + PAGE)}
                        className="mx-auto mt-6 flex h-12 items-center rounded-full border border-ink px-6 text-[15px] font-semibold transition duration-120 active:scale-96"
                    >
                        Show {Math.min(PAGE, results.length - limit)} more
                    </button>
                )}
            </div>

            <BottomSheet
                open={sheet === 'city'}
                onOpenChange={(o) => !o && setSheet(null)}
                title="Where"
            >
                {[ALL_CITIES, ...cities].map((c) => (
                    <ChoiceRow
                        key={c}
                        label={c === ALL_CITIES ? 'All cities' : c}
                        count={count(
                            'city',
                            (p) => c === ALL_CITIES || p.city === c,
                        )}
                        on={filters.city === c}
                        onChoose={() => choose({ city: c })}
                    />
                ))}
            </BottomSheet>

            <BottomSheet
                open={sheet === 'occasion'}
                onOpenChange={(o) => !o && setSheet(null)}
                title="Occasion"
            >
                <ChoiceRow
                    label="Any occasion"
                    count={count('occasion', () => true)}
                    on={!filters.occasion}
                    onChoose={() => choose({ occasion: null })}
                />
                {OCCASION_KEYS.map((k: OccasionKey) => (
                    <ChoiceRow
                        key={k}
                        label={OCCASIONS[k].label}
                        hint={OCCASIONS[k].hint}
                        count={count('occasion', (p) => p.occasion === k)}
                        on={filters.occasion === k}
                        onChoose={() => choose({ occasion: k })}
                    />
                ))}
            </BottomSheet>

            <BottomSheet
                open={sheet === 'status'}
                onOpenChange={(o) => !o && setSheet(null)}
                title="Show"
            >
                {(Object.keys(STATUS_FILTERS) as StatusFilter[]).map((s) => (
                    <ChoiceRow
                        key={s}
                        label={
                            s === 'all' ? 'Everything' : STATUS_FILTERS[s].label
                        }
                        hint={s === 'all' ? undefined : STATUS_FILTERS[s].hint}
                        count={count('status', (p) => matchesStatus(p, s))}
                        on={filters.status === s}
                        onChoose={() => choose({ status: s })}
                    />
                ))}
            </BottomSheet>

            <BottomSheet
                open={sheet === 'more'}
                onOpenChange={(o) => !o && setSheet(null)}
                title="More filters"
            >
                <button
                    type="button"
                    role="switch"
                    aria-checked={filters.hideNotRecommended}
                    onClick={() =>
                        update({
                            hideNotRecommended: !filters.hideNotRecommended,
                        })
                    }
                    className="flex min-h-[58px] w-full items-center justify-between gap-3 border-b border-line text-left text-[17px]"
                >
                    Hide places I don't recommend
                    <span
                        className={cn(
                            'relative h-[26px] w-11 shrink-0 rounded-full transition',
                            filters.hideNotRecommended
                                ? 'bg-olive'
                                : 'bg-line-strong',
                        )}
                    >
                        <span
                            className={cn(
                                'absolute top-[3px] size-5 rounded-full bg-paper transition-all',
                                filters.hideNotRecommended
                                    ? 'left-[21px]'
                                    : 'left-[3px]',
                            )}
                        />
                    </span>
                </button>

                <h3 className="mt-5 mb-1 text-[13px] font-semibold tracking-wide text-ink-muted uppercase">
                    Good for
                </h3>
                {GOOD_FOR_KEYS.map((g: GoodForKey) => (
                    <ChoiceRow
                        key={g}
                        multi
                        label={GOOD_FOR[g]}
                        count={count('goodFor', (p) => p.goodFor.includes(g))}
                        on={filters.goodFor.includes(g)}
                        onChoose={() =>
                            update({
                                goodFor: filters.goodFor.includes(g)
                                    ? filters.goodFor.filter((x) => x !== g)
                                    : [...filters.goodFor, g],
                            })
                        }
                    />
                ))}

                <h3 className="mt-5 mb-1 text-[13px] font-semibold tracking-wide text-ink-muted uppercase">
                    Cuisine
                </h3>
                {cuisines
                    .map((c) => ({
                        c,
                        n: count('cuisine', (p) => p.cuisine === c),
                    }))
                    .filter(({ c, n }) => n > 0 || filters.cuisines.includes(c))
                    .map(({ c, n }) => (
                        <ChoiceRow
                            key={c}
                            multi
                            label={c}
                            count={n}
                            on={filters.cuisines.includes(c)}
                            onChoose={() =>
                                update({
                                    cuisines: filters.cuisines.includes(c)
                                        ? filters.cuisines.filter(
                                              (x) => x !== c,
                                          )
                                        : [...filters.cuisines, c],
                                })
                            }
                        />
                    ))}

                <button
                    type="button"
                    onClick={() => setSheet(null)}
                    className="mt-6 h-12 w-full rounded-full bg-ink text-[15px] font-semibold text-paper"
                >
                    Show {results.length}{' '}
                    {results.length === 1 ? 'place' : 'places'}
                </button>
            </BottomSheet>
        </>
    );
}
