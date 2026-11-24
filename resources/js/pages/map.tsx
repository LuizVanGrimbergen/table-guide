import { Head } from '@inertiajs/react';
import {
    AdvancedMarker,
    APIProvider,
    Circle,
    Map as GoogleMap,
    useMap,
} from '@vis.gl/react-google-maps';
import { LocateFixed, MapPinOff } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    activeLabels,
    FilterBar,
    FilterSummary,
} from '@/components/tc/filter-bar';
import { MapPin } from '@/components/tc/map-pin';
import { PlaceCarousel } from '@/components/tc/place-carousel';
import { RestaurantRow } from '@/components/tc/restaurant-card';
import type { Filters, LatLng, Place } from '@/lib/collection';
import {
    defaultFilters,
    distanceKm,
    filterPlaces,
    statusOf,
} from '@/lib/collection';
import type { Cluster } from '@/lib/cluster';
import { flyTo, flyToBounds } from '@/lib/camera';
import { boundsOf, clusterPlaces } from '@/lib/cluster';
import { cn } from '@/lib/utils';

type City = { lat: number; lng: number };

type Props = {
    places: Place[];
    homeCity: string;
    mapId: string | null;
    cities: Record<string, City>;
};

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

const CAN_LOCATE =
    typeof navigator !== 'undefined' && 'geolocation' in navigator;

/** Sort weight for the cards when distance is unknown. */
function rank(p: Place): number {
    if (p.notRecommended) {
        return 3;
    }

    if (p.favourite) {
        return 0;
    }

    return p.status === 'been' ? 1 : 2;
}

export default function MapPage({ places, homeCity, mapId, cities }: Props) {
    const [filters, setFilters] = useState<Filters>(() =>
        defaultFilters(homeCity),
    );
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [maxKm, setMaxKm] = useState<number | null>(null);
    const [zoom, setZoom] = useState(12);
    // Set when a swipe lands on a card, so the map follows along.
    const [panTo, setPanTo] = useState<{ to: LatLng; n: number } | null>(null);

    // Live location: asked for only when he taps "Use my location" or the
    // locate button, never on page load, and never sent to the server.
    const [me, setMe] = useState<LatLng | null>(null);
    const [locating, setLocating] = useState(false);
    const [locateFailed, setLocateFailed] = useState(false);

    const locate = (then?: (pos: LatLng) => void) => {
        if (!CAN_LOCATE) {
            setLocateFailed(true);

            return;
        }

        setLocating(true);
        setLocateFailed(false);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const here = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                };
                setMe(here);
                setLocating(false);
                then?.(here);
            },
            () => {
                setLocating(false);
                setLocateFailed(true);
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
        );
    };

    const kmAway = (p: Place): number | null =>
        me && p.lat !== null && p.lng !== null
            ? distanceKm(me, { lat: p.lat, lng: p.lng })
            : null;
    const within = (p: Place, km: number) => {
        const d = kmAway(p);

        return d !== null && d <= km;
    };

    const update = (patch: Partial<Filters>) => {
        setFilters((f) => ({ ...f, ...patch }));
        setSelectedId(null);
    };
    const clearAll = () => {
        setFilters(defaultFilters(homeCity));
        setMaxKm(null);
        setSelectedId(null);
    };

    const city = filters.city;
    const cityPlaces = useMemo(
        () => places.filter((p) => p.city === city),
        [places, city],
    );
    const filtered = useMemo(
        () => filterPlaces(places, filters),
        [places, filters],
    );
    const activeKm = me ? maxKm : null;
    const inCity =
        activeKm === null
            ? filtered
            : filtered.filter((p) => within(p, activeKm));
    const pinned = inCity.filter((p) => p.lat !== null && p.lng !== null);

    // Card order: nearest first when we know where he is, otherwise his
    // favourites first, then places he has been, then the wishlist.
    const ordered = [...pinned].sort((a, b) => {
        const da = kmAway(a);
        const db = kmAway(b);

        if (da !== null && db !== null) {
            return da - db;
        }

        return rank(a) - rank(b) || a.name.localeCompare(b.name);
    });
    const { singles, clusters } = useMemo(
        () => clusterPlaces(ordered, Math.round(zoom), selectedId),
        // Recluster only when the pins, zoom level or selection change.
        [ordered.map((p) => p.id).join(','), Math.round(zoom), selectedId],
    );

    const centre = cities[city] ??
        cities[homeCity] ?? { lat: -33.8688, lng: 151.2093 };
    // Show the map as soon as the city has any located places, so a filter
    // with no matches shows an empty map with a reset, not the fallback.
    const canShowMap =
        !!MAPS_KEY && cityPlaces.some((p) => p.lat !== null && p.lng !== null);
    const pinKey = `${pinned.map((p) => p.id).join(',')}|${activeKm ?? ''}`;
    const showCards = canShowMap && ordered.length > 0;
    const labels = activeLabels(filters, homeCity, activeKm);

    return (
        <>
            <Head title="Map" />
            <div className="relative h-[calc(100dvh-64px-env(safe-area-inset-bottom))] overflow-hidden bg-sand md:h-dvh">
                {canShowMap ? (
                    <APIProvider apiKey={MAPS_KEY!} language="en">
                        <GoogleMap
                            key={city}
                            mapId={mapId || 'DEMO_MAP_ID'}
                            defaultCenter={centre}
                            defaultZoom={12}
                            // Vector maps zoom continuously instead of in steps.
                            renderingType={
                                'VECTOR' as google.maps.RenderingType
                            }
                            gestureHandling="greedy"
                            disableDefaultUI
                            clickableIcons={false}
                            onClick={() => setSelectedId(null)}
                            // Regroup pins once the map comes to rest, not on
                            // every frame of a pinch: that kept redrawing them.
                            onIdle={(ev) => setZoom(ev.map.getZoom() ?? 12)}
                            className="size-full"
                        >
                            {singles.map((p) => {
                                const on = p.id === selectedId;

                                return (
                                    <AdvancedMarker
                                        key={p.id}
                                        position={{ lat: p.lat!, lng: p.lng! }}
                                        title={`${p.name}, ${statusOf(p).label}`}
                                        zIndex={on ? 1000 : p.favourite ? 2 : 1}
                                        onClick={() => setSelectedId(p.id)}
                                    >
                                        <MapPin place={p} on={on} />
                                    </AdvancedMarker>
                                );
                            })}
                            {clusters.map((c) => (
                                <ClusterMarker key={c.key} cluster={c} />
                            ))}
                            {me && (
                                <AdvancedMarker
                                    position={me}
                                    title="You are here"
                                    zIndex={999}
                                    anchorPoint={['50%', '50%']}
                                >
                                    <span className="relative flex size-6 items-center justify-center">
                                        <span className="absolute inset-0 animate-ping rounded-full bg-brand/30" />
                                        <span className="size-4 rounded-full border-[3px] border-paper bg-brand shadow-[0_1px_4px_rgba(30,27,24,0.4)]" />
                                    </span>
                                </AdvancedMarker>
                            )}
                            {me && activeKm !== null && (
                                <Circle
                                    center={me}
                                    radius={activeKm * 1000}
                                    clickable={false}
                                    strokeColor="#A0522D"
                                    strokeOpacity={0.7}
                                    strokeWeight={1.5}
                                    fillColor="#A0522D"
                                    fillOpacity={0.06}
                                />
                            )}
                            <FitToPins
                                places={pinned}
                                pinKey={pinKey}
                                centre={activeKm !== null ? me : null}
                                radiusKm={activeKm}
                            />
                            <FollowSwipe request={panTo} />
                            <LocateButton
                                busy={locating}
                                raised={showCards}
                                onLocate={locate}
                            />
                        </GoogleMap>
                    </APIProvider>
                ) : (
                    <MapFallback places={inCity} missingKey={!MAPS_KEY} />
                )}

                {/* Top: the same four pills as the Collection, and one line
                    saying what is showing */}
                <div className="pointer-events-none absolute inset-x-0 top-0 px-4 pt-[max(12px,env(safe-area-inset-top))]">
                    <div className="pointer-events-auto">
                        <FilterBar
                            places={places}
                            filters={filters}
                            homeCity={homeCity}
                            onChange={update}
                            resultCount={pinned.length}
                            allowAllCities={false}
                            floating
                            near={
                                CAN_LOCATE
                                    ? {
                                          me,
                                          km: activeKm,
                                          locating,
                                          failed: locateFailed,
                                          locate: () => locate(),
                                          setKm: (km) => {
                                              setMaxKm(km);
                                              setSelectedId(null);
                                          },
                                          within,
                                      }
                                    : undefined
                            }
                        />
                    </div>
                    <FilterSummary
                        className="pointer-events-auto mt-2 inline-flex max-w-full rounded-full bg-paper/95 pr-1 pl-4 shadow-[0_2px_8px_rgba(30,27,24,0.14)] backdrop-blur"
                        count={pinned.length}
                        labels={labels}
                        onClear={clearAll}
                    />
                </div>

                {/* Bottom: swipe through the places on the map */}
                {showCards && (
                    <div className="absolute inset-x-0 bottom-0">
                        <PlaceCarousel
                            places={ordered}
                            selectedId={selectedId}
                            kmAway={kmAway}
                            onSwipeTo={(p) => {
                                setSelectedId(p.id);
                                setPanTo((cur) => ({
                                    to: { lat: p.lat!, lng: p.lng! },
                                    n: (cur?.n ?? 0) + 1,
                                }));
                            }}
                        />
                    </div>
                )}

                {/* Nothing matches */}
                {canShowMap && pinned.length === 0 && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
                        <div className="pointer-events-auto mx-auto max-w-md rounded-card border border-line bg-paper p-5 text-center shadow-[0_8px_24px_rgba(30,27,24,0.18)]">
                            <p className="font-serif text-[20px]">
                                No places match these filters
                            </p>
                            <button
                                type="button"
                                onClick={clearAll}
                                className="mt-3 h-11 rounded-full bg-brand px-6 text-[15px] font-semibold text-paper"
                            >
                                Show all places
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

/**
 * Zooms the map to fit the visible pins whenever the filters change (not when
 * a pin is selected). One pin: centre on it at street level.
 */
function FitToPins({
    places,
    pinKey,
    centre,
    radiusKm,
}: {
    places: Place[];
    pinKey: string;
    centre: LatLng | null;
    radiusKm: number | null;
}) {
    const map = useMap();
    // The first fit happens as the map opens: no glide then.
    const firstFit = useRef(true);

    useEffect(() => {
        if (!map) {
            return;
        }

        const duration = firstFit.current ? 0 : undefined;
        firstFit.current = false;

        // With a distance filter on, show the whole circle around you.
        const points: LatLng[] =
            centre && radiusKm !== null
                ? [
                      { lat: centre.lat + radiusKm / 111, lng: centre.lng },
                      { lat: centre.lat - radiusKm / 111, lng: centre.lng },
                      {
                          lat: centre.lat,
                          lng:
                              centre.lng +
                              radiusKm /
                                  (111 *
                                      Math.cos((centre.lat * Math.PI) / 180)),
                      },
                      {
                          lat: centre.lat,
                          lng:
                              centre.lng -
                              radiusKm /
                                  (111 *
                                      Math.cos((centre.lat * Math.PI) / 180)),
                      },
                  ]
                : places.map((p) => ({ lat: p.lat!, lng: p.lng! }));

        if (points.length === 0) {
            return;
        }

        if (points.length === 1) {
            flyTo(map, { center: points[0], zoom: 15 }, duration);

            return;
        }

        flyToBounds(
            map,
            boundsOf(points),
            { top: 190, bottom: 150, left: 40, right: 40 },
            16,
            duration,
        );
        // Only refit when the set of pins changes, not on every render.
    }, [map, pinKey]);

    return null;
}

/** Numbered bubble for pins that sit too close together; tap to zoom in. */
function ClusterMarker({ cluster }: { cluster: Cluster<Place> }) {
    const map = useMap();
    const n = cluster.items.length;
    const size = n < 10 ? 36 : n < 25 ? 42 : 48;
    const favs = cluster.items.filter((p) => p.favourite).length;

    return (
        <AdvancedMarker
            position={cluster.centre}
            title={`${n} places, tap to zoom in`}
            zIndex={5}
            anchorPoint={['50%', '50%']}
            onClick={() => {
                if (!map) {
                    return;
                }

                const b = boundsOf(
                    cluster.items.map((p) => ({ lat: p.lat!, lng: p.lng! })),
                );

                if (b.north - b.south < 0.0005 && b.east - b.west < 0.0005) {
                    flyTo(map, {
                        center: cluster.centre,
                        zoom: Math.min((map.getZoom() ?? 12) + 3, 19),
                    });
                } else {
                    flyToBounds(
                        map,
                        b,
                        { top: 190, bottom: 170, left: 50, right: 50 },
                        18,
                    );
                }
            }}
        >
            <span
                className="flex animate-in items-center justify-center rounded-full border-2 border-brand bg-paper font-semibold text-brand tabular-nums shadow-[0_2px_8px_rgba(30,27,24,0.25)] transition-transform duration-200 zoom-in-75 fade-in active:scale-90 motion-reduce:animate-none"
                style={{
                    width: size,
                    height: size,
                    fontSize: n < 100 ? 15 : 13,
                    // A wine ring when the group holds favourites.
                    boxShadow: favs
                        ? '0 0 0 2px #FFFDF9, 0 0 0 4px #8B2E3B, 0 2px 8px rgba(30,27,24,0.25)'
                        : undefined,
                }}
            >
                {n}
            </span>
        </AdvancedMarker>
    );
}

/** Pans to the card he swiped to, unless that pin is already well in view. */
function FollowSwipe({
    request,
}: {
    request: { to: LatLng; n: number } | null;
}) {
    const map = useMap();

    useEffect(() => {
        if (!map || !request) {
            return;
        }

        const bounds = map.getBounds();

        if (bounds) {
            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            const latPad = (ne.lat() - sw.lat()) * 0.25;
            const lngPad = (ne.lng() - sw.lng()) * 0.15;
            const { lat, lng } = request.to;
            const comfortable =
                lat < ne.lat() - latPad * 0.6 &&
                lat > sw.lat() + latPad &&
                lng < ne.lng() - lngPad &&
                lng > sw.lng() + lngPad;

            if (comfortable) {
                return;
            }
        }

        map.panTo(request.to);
        // Only when a new swipe asks for it.
    }, [map, request?.n]);

    return null;
}

function LocateButton({
    busy,
    raised,
    onLocate,
}: {
    busy: boolean;
    raised: boolean;
    onLocate: (then?: (pos: LatLng) => void) => void;
}) {
    const map = useMap();

    if (!CAN_LOCATE) {
        return null;
    }

    return (
        <button
            type="button"
            aria-label="Show where I am"
            disabled={busy}
            onClick={() =>
                onLocate((pos) => {
                    if (map) {
                        flyTo(map, { center: pos, zoom: 14 });
                    }
                })
            }
            className={cn(
                'absolute right-4 flex size-12 items-center justify-center rounded-full bg-paper text-ink shadow-[0_2px_8px_rgba(30,27,24,0.2)] transition-[bottom,transform] active:scale-96 disabled:opacity-60',
                raised
                    ? 'bottom-[136px]'
                    : 'bottom-[max(24px,env(safe-area-inset-bottom))]',
            )}
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
