import type { LatLng } from '@/lib/collection';

export type Located = { id: number; lat: number | null; lng: number | null };

export type Cluster<T> = { key: string; centre: LatLng; items: T[] };

/** Pins closer than this on screen (CSS px) merge into one bubble. */
const RADIUS_PX = 40;

/** From this zoom level on (street level) every pin is shown on its own. */
export const NO_CLUSTER_ZOOM = 16;

/** Web Mercator world pixel position at a zoom level. */
function toPixels(
    { lat, lng }: LatLng,
    zoom: number,
): { x: number; y: number } {
    const scale = 256 * 2 ** zoom;
    const sin = Math.min(
        Math.max(Math.sin((lat * Math.PI) / 180), -0.9999),
        0.9999,
    );

    return {
        x: ((lng + 180) / 360) * scale,
        y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
    };
}

/**
 * Greedy screen-space clustering: walk the places in the given order (put
 * the most important first) and add each to the first cluster within
 * RADIUS_PX, or start a new one. `keepAlone` (the selected place) is never
 * merged. Fine for a few hundred places; no library needed.
 */
export function clusterPlaces<T extends Located>(
    places: T[],
    zoom: number,
    keepAlone: number | null = null,
): { singles: T[]; clusters: Cluster<T>[] } {
    const located = places.filter(
        (p): p is T & { lat: number; lng: number } =>
            p.lat !== null && p.lng !== null,
    );

    if (zoom >= NO_CLUSTER_ZOOM) {
        return { singles: located, clusters: [] };
    }

    const groups: { x: number; y: number; items: (T & LatLng)[] }[] = [];
    const singles: T[] = [];

    for (const p of located) {
        if (p.id === keepAlone) {
            singles.push(p);
            continue;
        }

        const { x, y } = toPixels(p, zoom);
        const near = groups.find(
            (g) => Math.hypot(g.x - x, g.y - y) <= RADIUS_PX,
        );

        if (near) {
            near.items.push(p);
        } else {
            groups.push({ x, y, items: [p] });
        }
    }

    const clusters: Cluster<T>[] = [];

    for (const g of groups) {
        if (g.items.length === 1) {
            singles.push(g.items[0]);
            continue;
        }

        clusters.push({
            key: g.items
                .map((p) => p.id)
                .sort((a, b) => a - b)
                .join('-'),
            centre: {
                lat: g.items.reduce((s, p) => s + p.lat, 0) / g.items.length,
                lng: g.items.reduce((s, p) => s + p.lng, 0) / g.items.length,
            },
            items: g.items,
        });
    }

    return { singles, clusters };
}

/** Bounds literal around a set of points. */
export function boundsOf(points: LatLng[]): {
    north: number;
    south: number;
    east: number;
    west: number;
} {
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);

    return {
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lngs),
        west: Math.min(...lngs),
    };
}
