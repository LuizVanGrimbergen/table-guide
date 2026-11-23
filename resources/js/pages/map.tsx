import { Head, Link } from '@inertiajs/react';
import {
    AdvancedMarker,
    APIProvider,
    Map as GoogleMap,
    useMap,
} from '@vis.gl/react-google-maps';
import { LocateFixed, MapPinOff, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BottomSheet } from '@/components/tc/bottom-sheet';
import { ChoiceRow } from '@/components/tc/choice-row';
import { RestaurantRow, StatusBadge } from '@/components/tc/restaurant-card';
import type { Place, StatusFilter } from '@/lib/collection';
import {
    directionsUrl,
    matchesStatus,
    placeLine,
    statusOf,
} from '@/lib/collection';
import { cn } from '@/lib/utils';

type City = { lat: number; lng: number };

type Props = {
    places: Place[];
    homeCity: string;
    mapId: string | null;
    cities: Record<string, City>;
};

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

const CHIPS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'been', label: 'Been there' },
    { key: 'wish', label: 'Wishlist' },
    { key: 'fav', label: 'Favourites' },
];

/** Pin colours: olive been, outlined burgundy wishlist, burgundy favourite, grey not recommended. */
function pinStyle(place: Place): { bg: string; fg: string; border: string } {
    const status = statusOf(place).key;

    if (status === 'not_recommended') {
        return { bg: '#A69B8C', fg: '#FFFDF9', border: '#FFFDF9' };
    }

    if (status === 'favourite') {
        return { bg: '#7B2D2B', fg: '#FFFDF9', border: '#FFFDF9' };
    }

    if (status === 'wish') {
        return { bg: '#FFFDF9', fg: '#7B2D2B', border: '#7B2D2B' };
    }

    return { bg: '#4F5A2E', fg: '#FFFDF9', border: '#FFFDF9' };
}

export default function MapPage({ places, homeCity, mapId, cities }: Props) {
    const [city, setCity] = useState(homeCity);
    const [status, setStatus] = useState<StatusFilter>('all');
    const [hideNotRecommended, setHideNotRecommended] = useState(false);
    const [selected, setSelected] = useState<Place | null>(null);
    const [filtersOpen, setFiltersOpen] = useState(false);

    const inCity = useMemo(
        () =>
            places.filter(
                (p) =>
                    p.city === city &&
                    matchesStatus(p, status) &&
                    !(hideNotRecommended && p.notRecommended),
            ),
        [places, city, status, hideNotRecommended],
    );
    const pinned = inCity.filter((p) => p.lat !== null && p.lng !== null);
    const cityNames = [...new Set(places.map((p) => p.city))].sort();
    const centre = cities[city] ??
        cities[homeCity] ?? { lat: -33.8688, lng: 151.2093 };
    const canShowMap = !!MAPS_KEY && pinned.length > 0;

    return (
        <>
            <Head title="Map" />
            <div className="relative h-[calc(100dvh-64px-env(safe-area-inset-bottom))] overflow-hidden bg-sand md:h-dvh">
                {canShowMap ? (
                    <APIProvider apiKey={MAPS_KEY!}>
                        <GoogleMap
                            key={city}
                            mapId={mapId || 'DEMO_MAP_ID'}
                            defaultCenter={centre}
                            defaultZoom={12}
                            gestureHandling="greedy"
                            disableDefaultUI
                            clickableIcons={false}
                            onClick={() => setSelected(null)}
                            className="size-full"
                        >
                            {pinned.map((p) => {
                                const s = pinStyle(p);
                                const on = selected?.id === p.id;

                                return (
                                    <AdvancedMarker
                                        key={p.id}
                                        position={{ lat: p.lat!, lng: p.lng! }}
                                        title={`${p.name}, ${statusOf(p).label}`}
                                        zIndex={on ? 10 : 1}
                                        onClick={() => setSelected(p)}
                                    >
                                        <span
                                            className="flex items-center justify-center rounded-full font-serif italic shadow-[0_2px_6px_rgba(30,27,24,0.3)] transition-all"
                                            style={{
                                                width: on ? 38 : 28,
                                                height: on ? 38 : 28,
                                                background: s.bg,
                                                color: s.fg,
                                                border: `2px solid ${s.border}`,
                                                fontSize: on ? 19 : 15,
                                            }}
                                        >
                                            {p.name.charAt(0)}
                                        </span>
                                    </AdvancedMarker>
                                );
                            })}
                            <LocateButton />
                        </GoogleMap>
                    </APIProvider>
                ) : (
                    <MapFallback places={inCity} missingKey={!MAPS_KEY} />
                )}

                {/* Top overlay */}
                <div className="pointer-events-none absolute inset-x-0 top-0 px-4 pt-[max(12px,env(safe-area-inset-top))]">
                    <div className="pointer-events-auto flex items-center gap-2">
                        <div className="flex-1 rounded-full bg-paper/95 px-4 py-2 shadow-[0_2px_8px_rgba(30,27,24,0.12)]">
                            <p className="font-serif text-[20px] leading-tight">
                                {city}
                            </p>
                            <p className="text-[13px] text-ink-muted">
                                {pinned.length} on map
                                {inCity.length > pinned.length &&
                                    ` · ${inCity.length - pinned.length} not located yet`}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFiltersOpen(true)}
                            className={cn(
                                'flex h-11 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold shadow-[0_2px_8px_rgba(30,27,24,0.12)] transition active:scale-96',
                                city !== homeCity || hideNotRecommended
                                    ? 'bg-ink text-paper'
                                    : 'bg-paper text-ink',
                            )}
                        >
                            <SlidersHorizontal
                                className="size-4"
                                strokeWidth={1.8}
                            />
                            Filters
                        </button>
                    </div>
                    <div className="pointer-events-auto -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-2">
                        {CHIPS.map((c) => (
                            <button
                                key={c.key}
                                type="button"
                                aria-pressed={status === c.key}
                                onClick={() => {
                                    setStatus(c.key);
                                    setSelected(null);
                                }}
                                className={cn(
                                    'flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-[14px] font-medium shadow-[0_2px_8px_rgba(30,27,24,0.12)] transition active:scale-96',
                                    status === c.key
                                        ? 'border-ink bg-ink text-paper'
                                        : 'border-paper bg-paper text-ink',
                                )}
                            >
                                {c.key !== 'all' && (
                                    <span
                                        className="size-2.5 rounded-full border-[1.5px]"
                                        style={{
                                            background:
                                                c.key === 'wish'
                                                    ? '#FFFDF9'
                                                    : c.key === 'fav'
                                                      ? '#7B2D2B'
                                                      : '#4F5A2E',
                                            borderColor:
                                                c.key === 'wish'
                                                    ? '#7B2D2B'
                                                    : 'transparent',
                                        }}
                                    />
                                )}
                                {c.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Selected pin card */}
                {selected && (
                    <div className="absolute inset-x-0 bottom-0 p-4">
                        <div className="relative mx-auto max-w-md rounded-card border border-line bg-paper p-4 shadow-[0_8px_24px_rgba(30,27,24,0.18)]">
                            <button
                                type="button"
                                aria-label="Close"
                                onClick={() => setSelected(null)}
                                className="absolute top-1 right-1 flex size-11 items-center justify-center text-ink-muted"
                            >
                                <X className="size-5" strokeWidth={1.6} />
                            </button>
                            <StatusBadge place={selected} />
                            <p className="mt-1 pr-8 font-serif text-[23px] leading-tight">
                                {selected.name}
                            </p>
                            <p className="text-sm text-ink-muted">
                                {placeLine(selected)}
                            </p>
                            {selected.note && (
                                <p className="mt-1.5 line-clamp-2 font-serif text-[17px] text-espresso italic">
                                    {selected.note}
                                </p>
                            )}
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <a
                                    href={directionsUrl(selected)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex h-12 items-center justify-center rounded-full border border-ink text-[15px] font-semibold"
                                >
                                    Directions
                                </a>
                                <Link
                                    href={`/restaurants/${selected.restaurantId}`}
                                    className="flex h-12 items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-paper"
                                >
                                    Details
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <BottomSheet
                open={filtersOpen}
                onOpenChange={setFiltersOpen}
                title="Map filters"
            >
                <button
                    type="button"
                    role="switch"
                    aria-checked={hideNotRecommended}
                    onClick={() => setHideNotRecommended((v) => !v)}
                    className="flex min-h-[58px] w-full items-center justify-between gap-3 border-b border-line text-left text-[17px]"
                >
                    Hide places I don't recommend
                    <span
                        className={cn(
                            'relative h-[26px] w-11 shrink-0 rounded-full transition',
                            hideNotRecommended ? 'bg-olive' : 'bg-line-strong',
                        )}
                    >
                        <span
                            className={cn(
                                'absolute top-[3px] size-5 rounded-full bg-paper transition-all',
                                hideNotRecommended
                                    ? 'left-[21px]'
                                    : 'left-[3px]',
                            )}
                        />
                    </span>
                </button>
                <h3 className="mt-5 mb-1 text-[13px] font-semibold tracking-wide text-ink-muted uppercase">
                    City
                </h3>
                {cityNames.map((c) => (
                    <ChoiceRow
                        key={c}
                        label={c}
                        count={places.filter((p) => p.city === c).length}
                        on={city === c}
                        onChoose={() => {
                            setCity(c);
                            setSelected(null);
                            setFiltersOpen(false);
                        }}
                    />
                ))}
            </BottomSheet>
        </>
    );
}

function LocateButton() {
    const map = useMap();
    const [busy, setBusy] = useState(false);

    useEffect(() => () => setBusy(false), []);

    if (!('geolocation' in navigator)) {
        return null;
    }

    return (
        <button
            type="button"
            aria-label="Show where I am"
            disabled={busy}
            onClick={() => {
                setBusy(true);
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        map?.panTo({
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                        });
                        map?.setZoom(14);
                        setBusy(false);
                    },
                    () => setBusy(false),
                    { enableHighAccuracy: false, timeout: 10000 },
                );
            }}
            className="absolute right-4 bottom-[max(24px,env(safe-area-inset-bottom))] flex size-12 items-center justify-center rounded-full bg-paper text-ink shadow-[0_2px_8px_rgba(30,27,24,0.2)] transition active:scale-96 disabled:opacity-60"
        >
            <LocateFixed className="size-5" strokeWidth={1.6} />
        </button>
    );
}

/** Shown until a browser key is set and places have been geocoded. */
function MapFallback({
    places,
    missingKey,
}: {
    places: Place[];
    missingKey: boolean;
}) {
    return (
        <div className="size-full overflow-y-auto px-4 pt-40 pb-8">
            <div className="mx-auto max-w-md">
                <div className="rounded-card border border-line bg-paper p-5 text-center">
                    <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-sand text-ink-muted">
                        <MapPinOff className="size-6" strokeWidth={1.5} />
                    </span>
                    <p className="mt-3 font-serif text-[22px]">
                        The map isn't ready yet
                    </p>
                    <p className="mt-1 text-[15px] text-ink-muted">
                        {missingKey
                            ? 'It appears once the Google Maps key is added.'
                            : 'Places get pins once their locations have been looked up.'}{' '}
                        Directions already work from each place.
                    </p>
                </div>
                {places.length > 0 && (
                    <div className="mt-4 rounded-card border border-line bg-paper px-4">
                        {places.map((p) => (
                            <RestaurantRow key={p.id} place={p} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
