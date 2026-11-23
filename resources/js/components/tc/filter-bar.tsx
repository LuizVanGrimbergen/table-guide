import { Navigation } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { BottomSheet } from '@/components/tc/bottom-sheet';
import { ChoiceRow } from '@/components/tc/choice-row';
import { Pill } from '@/components/tc/pill';
import type {
    Filters,
    GoodForKey,
    LatLng,
    Place,
    StatusFilter,
} from '@/lib/collection';
import {
    ALL_CITIES,
    countWhere,
    GOOD_FOR,
    GOOD_FOR_KEYS,
    matchesStatus,
    moreCount,
    OCCASION_KEYS,
    OCCASIONS,
    STATUS_FILTERS,
} from '@/lib/collection';
import { cuisineIcon, OCCASION_ICONS } from '@/lib/place-icons';
import { cn } from '@/lib/utils';

/** Live-location distance filter, only on the map. */
export type NearMe = {
    me: LatLng | null;
    km: number | null;
    locating: boolean;
    failed: boolean;
    locate: () => void;
    setKm: (km: number | null) => void;
    within: (place: Place, km: number) => boolean;
};

type Sheet = 'where' | 'occasion' | 'status' | 'more' | null;

const DISTANCES: { km: number; hint: string }[] = [
    { km: 1, hint: 'Walking distance' },
    { km: 2, hint: 'A short walk or quick taxi' },
    { km: 5, hint: 'A short drive' },
    { km: 10, hint: 'Across town' },
];

const HEADING =
    'mt-5 mb-1 text-[13px] font-semibold tracking-wide text-ink-muted uppercase first:mt-0';

type Props = {
    places: Place[];
    filters: Filters;
    homeCity: string;
    onChange: (patch: Partial<Filters>) => void;
    /** Number of places the current filters show (for "Show N places"). */
    resultCount: number;
    near?: NearMe;
    /** The map has a single city at a time, so no "All cities" there. */
    allowAllCities?: boolean;
    /** Floating over the map: add a shadow so the pills read on any tile. */
    floating?: boolean;
};

/**
 * The same four filter pills on the Collection and the Map:
 * [Where ▾] [Occasion ▾] [Show ▾] [More ▾]. Each says what it filters and
 * shows the current choice; tapping opens a short list that closes on pick.
 */
export function FilterBar({
    places,
    filters,
    homeCity,
    onChange,
    resultCount,
    near,
    allowAllCities = true,
    floating,
}: Props) {
    const [sheet, setSheet] = useState<Sheet>(null);
    const close = () => setSheet(null);
    const choose = (patch: Partial<Filters>) => {
        onChange(patch);
        close();
    };

    // Counts respect the distance filter too, when it is on.
    const base = useMemo(
        () =>
            near?.km != null
                ? places.filter((p) => near.within(p, near.km!))
                : places,
        [places, near],
    );
    const count = (
        skip: Parameters<typeof countWhere>[2],
        test: (p: Place) => boolean,
    ) => countWhere(base, filters, skip, test);

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
    const more = moreCount(filters);
    const km = near?.km ?? null;
    const shadow = floating && 'shadow-[0_2px_8px_rgba(30,27,24,0.14)]';
    const OccasionIcon = filters.occasion
        ? OCCASION_ICONS[filters.occasion]
        : null;

    return (
        <>
            <div className="flex flex-wrap gap-2">
                <Pill
                    chevron
                    active={km !== null || filters.city !== homeCity}
                    onClick={() => setSheet('where')}
                    label="Choose where"
                    className={cn(shadow)}
                >
                    {km !== null && (
                        <Navigation className="size-4" strokeWidth={1.8} />
                    )}
                    {km !== null
                        ? `Within ${km} km`
                        : filters.city === ALL_CITIES
                          ? 'All cities'
                          : filters.city}
                </Pill>
                <Pill
                    chevron
                    active={!!filters.occasion}
                    onClick={() => setSheet('occasion')}
                    label="Choose occasion"
                    className={cn(shadow)}
                >
                    {OccasionIcon && (
                        <OccasionIcon className="size-4" strokeWidth={1.8} />
                    )}
                    {filters.occasion
                        ? OCCASIONS[filters.occasion].label
                        : 'Occasion'}
                </Pill>
                <Pill
                    chevron
                    active={filters.status !== 'all'}
                    onClick={() => setSheet('status')}
                    label="Choose what to show"
                    className={cn(shadow)}
                >
                    {STATUS_FILTERS[filters.status].label}
                </Pill>
                <Pill
                    chevron
                    active={more > 0}
                    onClick={() => setSheet('more')}
                    label="More filters"
                    className={cn(shadow)}
                >
                    {more ? `More · ${more}` : 'More'}
                </Pill>
            </div>

            {/* Where: near me (map only) and city */}
            <BottomSheet
                open={sheet === 'where'}
                onOpenChange={(o) => !o && close()}
                title="Where"
            >
                {near && (
                    <>
                        <h3 className={HEADING}>Near me</h3>
                        {near.me ? (
                            <>
                                <ChoiceRow
                                    label={`Anywhere in ${filters.city === ALL_CITIES ? 'the city' : filters.city}`}
                                    count={countWhere(
                                        places,
                                        filters,
                                        null,
                                        () => true,
                                    )}
                                    on={km === null}
                                    onChoose={() => {
                                        near.setKm(null);
                                        close();
                                    }}
                                />
                                {DISTANCES.map((d) => (
                                    <ChoiceRow
                                        key={d.km}
                                        label={`Within ${d.km} km`}
                                        hint={d.hint}
                                        count={
                                            countWhere(
                                                places,
                                                filters,
                                                null,
                                                (p) => near.within(p, d.km),
                                            )
                                        }
                                        on={km === d.km}
                                        onChoose={() => {
                                            near.setKm(d.km);
                                            // Refresh the position quietly
                                            // in case he has moved.
                                            near.locate();
                                            close();
                                        }}
                                    />
                                ))}
                                <p className="mt-2 text-[13px] text-ink-muted">
                                    Straight-line distance, not travel time.
                                    Your location stays on this phone.
                                </p>
                            </>
                        ) : near.locating ? (
                            <p className="py-4 text-[17px] text-ink-muted">
                                Finding where you are…
                            </p>
                        ) : (
                            <>
                                <ChoiceRow
                                    icon={Navigation}
                                    label="Use my location"
                                    hint={
                                        near.failed
                                            ? "Couldn't find you. Allow location for this app in your settings, then try again."
                                            : 'See what is within walking distance'
                                    }
                                    on={false}
                                    onChoose={near.locate}
                                />
                            </>
                        )}
                        <h3 className={HEADING}>City</h3>
                    </>
                )}
                {(allowAllCities ? [ALL_CITIES, ...cities] : cities).map(
                    (c) => (
                        <ChoiceRow
                            key={c}
                            label={c === ALL_CITIES ? 'All cities' : c}
                            count={count(
                                'city',
                                (p) => c === ALL_CITIES || p.city === c,
                            )}
                            on={filters.city === c && km === null}
                            onChoose={() => {
                                near?.setKm(null);
                                choose({ city: c, cuisines: [] });
                            }}
                        />
                    ),
                )}
            </BottomSheet>

            <BottomSheet
                open={sheet === 'occasion'}
                onOpenChange={(o) => !o && close()}
                title="Occasion"
            >
                <ChoiceRow
                    label="Any occasion"
                    count={count('occasion', () => true)}
                    on={!filters.occasion}
                    onChoose={() => choose({ occasion: null })}
                />
                {OCCASION_KEYS.map((k) => (
                    <ChoiceRow
                        key={k}
                        icon={OCCASION_ICONS[k]}
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
                onOpenChange={(o) => !o && close()}
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
                onOpenChange={(o) => !o && close()}
                title="More filters"
            >
                <button
                    type="button"
                    role="switch"
                    aria-checked={filters.hideNotRecommended}
                    onClick={() =>
                        onChange({
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
                                ? 'bg-brand'
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

                <h3 className={HEADING}>Good for</h3>
                {GOOD_FOR_KEYS.map((g: GoodForKey) => (
                    <ChoiceRow
                        key={g}
                        multi
                        label={GOOD_FOR[g]}
                        count={count('goodFor', (p) => p.goodFor.includes(g))}
                        on={filters.goodFor.includes(g)}
                        onChoose={() =>
                            onChange({
                                goodFor: filters.goodFor.includes(g)
                                    ? filters.goodFor.filter((x) => x !== g)
                                    : [...filters.goodFor, g],
                            })
                        }
                    />
                ))}

                <h3 className={HEADING}>Cuisine</h3>
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
                            icon={cuisineIcon(c)}
                            label={c}
                            count={n}
                            on={filters.cuisines.includes(c)}
                            onChoose={() =>
                                onChange({
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
                    onClick={close}
                    className="sticky bottom-0 mt-6 h-12 w-full rounded-full bg-brand text-[15px] font-semibold text-paper"
                >
                    Show {resultCount} {resultCount === 1 ? 'place' : 'places'}
                </button>
            </BottomSheet>
        </>
    );
}

/** Short labels for what is filtered, for the "Showing" line. */
export function activeLabels(
    filters: Filters,
    homeCity: string,
    km: number | null = null,
): string[] {
    return [
        km !== null
            ? `Within ${km} km`
            : filters.city !== homeCity
              ? filters.city === ALL_CITIES
                  ? 'All cities'
                  : filters.city
              : null,
        filters.occasion ? OCCASIONS[filters.occasion].label : null,
        filters.status !== 'all' ? STATUS_FILTERS[filters.status].label : null,
        ...filters.goodFor.map((g) => GOOD_FOR[g]),
        ...filters.cuisines,
        filters.hideNotRecommended ? 'Hiding not recommended' : null,
    ].filter((l): l is string => !!l);
}

/** "11 places · Favourites · Italian   Clear" */
export function FilterSummary({
    count,
    labels,
    onClear,
    children,
    className,
}: {
    count: number;
    labels: string[];
    onClear: () => void;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex min-h-11 items-center gap-2', className)}>
            <p className="min-w-0 flex-1 truncate text-[15px]" aria-live="polite">
                <span className="font-semibold tabular-nums">
                    {count} {count === 1 ? 'place' : 'places'}
                </span>
                {labels.length > 0 && (
                    <span className="text-ink-muted">
                        {' · '}
                        {labels.join(' · ')}
                    </span>
                )}
            </p>
            {labels.length > 0 && (
                <button
                    type="button"
                    onClick={onClear}
                    className="h-11 shrink-0 px-2 text-[15px] font-semibold text-brand"
                >
                    Clear
                </button>
            )}
            {children}
        </div>
    );
}
