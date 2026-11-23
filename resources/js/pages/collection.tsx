import { Head } from '@inertiajs/react';
import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    activeLabels,
    FilterBar,
    FilterSummary,
} from '@/components/tc/filter-bar';
import { PlaceList } from '@/components/tc/place-list';
import type { Filters, Place } from '@/lib/collection';
import {
    defaultFilters,
    filterPlaces,
    filtersFromParams,
    filtersToQuery,
    parseQuery,
    understoodLine,
} from '@/lib/collection';

type Props = {
    places: Place[];
    homeCity: string;
    initial: Record<string, string>;
};

export default function CollectionPage({ places, homeCity, initial }: Props) {
    const [filters, setFilters] = useState<Filters>(() =>
        filtersFromParams(initial, homeCity),
    );
    const searchRef = useRef<HTMLInputElement>(null);

    const update = (patch: Partial<Filters>) => {
        setFilters((f) => ({ ...f, ...patch }));
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

    const results = useMemo(
        () => filterPlaces(places, filters),
        [places, filters],
    );
    const parsed = useMemo(
        () => parseQuery(filters.q, places),
        [filters.q, places],
    );
    const understood = understoodLine(parsed);
    return (
        <>
            <Head title="My Places" />
            <div className="px-5 pt-3 md:px-0 md:pt-0">
                <h1 className="mb-4 font-serif text-[34px] leading-tight md:text-[36px]">
                    My Places
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

                {/* The four pills, shared with the Map */}
                <div className="mt-4">
                    <FilterBar
                        places={places}
                        filters={filters}
                        homeCity={homeCity}
                        onChange={update}
                        resultCount={results.length}
                    />
                </div>

                {/* What is showing, and Clear */}
                <FilterSummary
                    className="mt-3 mb-2"
                    count={results.length}
                    labels={activeLabels(filters, homeCity)}
                    onClear={() => update(defaultFilters(homeCity))}
                />

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
                            className="mt-4 h-11 rounded-full border border-brand px-5 text-[15px] font-semibold text-brand"
                        >
                            Reset filters
                        </button>
                    </div>
                ) : (
                    <PlaceList places={results} city={filters.city} />
                )}
            </div>
        </>
    );
}
