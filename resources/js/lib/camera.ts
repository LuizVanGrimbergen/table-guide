import type { LatLng } from '@/lib/collection';

/**
 * Smooth camera moves for the map. Google's own setZoom jumps when it
 * changes by more than one level and fitBounds jumps too; these glide
 * instead, by easing centre and zoom together on every frame.
 */

export type Bounds = {
    north: number;
    south: number;
    east: number;
    west: number;
};
export type Padding = {
    top: number;
    bottom: number;
    left: number;
    right: number;
};
export type Camera = { center: LatLng; zoom: number };

/** The bits of google.maps.Map this needs; easy to fake in tests. */
type CameraMap = {
    getCenter(): { lat(): number; lng(): number } | undefined;
    getZoom(): number | undefined;
    getDiv(): HTMLElement;
    moveCamera(camera: { center?: LatLng; zoom?: number }): void;
    addListener?(event: string, handler: () => void): { remove(): void };
};

const MIN_ZOOM = 3;
const MAX_ZOOM = 19;
const DURATION_MS = 550;

/** Web Mercator y (0..1 across the world) for a latitude. */
function mercatorY(lat: number): number {
    const sin = Math.min(
        Math.max(Math.sin((lat * Math.PI) / 180), -0.9999),
        0.9999,
    );

    return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
}

function latFromMercatorY(y: number): number {
    return (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;
}

/**
 * The centre and zoom that show $bounds inside a $width x $height map,
 * keeping $padding free (for the filter bar and the cards). Never closer
 * than $maxZoom, so one tight group doesn't zoom to the rooftops.
 */
export function cameraForBounds(
    bounds: Bounds,
    width: number,
    height: number,
    padding: Padding,
    maxZoom = 16,
): Camera {
    const usableW = Math.max(width - padding.left - padding.right, 40);
    const usableH = Math.max(height - padding.top - padding.bottom, 40);

    const top = mercatorY(bounds.north);
    const bottom = mercatorY(bounds.south);
    const spanX = Math.max((bounds.east - bounds.west) / 360, 1e-9);
    const spanY = Math.max(bottom - top, 1e-9);

    const zoom = Math.min(
        Math.log2(usableW / (256 * spanX)),
        Math.log2(usableH / (256 * spanY)),
        maxZoom,
    );

    // Centre of the usable area, shifted back by the uneven padding.
    const worldPx = 256 * 2 ** zoom;
    const midX = (bounds.west + bounds.east) / 2 / 360 + 0.5;
    const midY = (top + bottom) / 2;
    const shiftX = (padding.right - padding.left) / 2 / worldPx;
    const shiftY = (padding.bottom - padding.top) / 2 / worldPx;

    return {
        center: {
            lat: latFromMercatorY(midY + shiftY),
            lng: (midX + shiftX - 0.5) * 360,
        },
        zoom: Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM),
    };
}

/** Slow start, slow end. */
export function easeInOut(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Where the camera is $t (0..1, eased) of the way from $from to $to. */
export function cameraAt(from: Camera, to: Camera, t: number): Camera {
    const e = easeInOut(t);
    // Move the centre in Mercator space, so north-south moves look even.
    const y =
        mercatorY(from.center.lat) +
        (mercatorY(to.center.lat) - mercatorY(from.center.lat)) * e;

    return {
        center: {
            lat: latFromMercatorY(y),
            lng: from.center.lng + (to.center.lng - from.center.lng) * e,
        },
        zoom: from.zoom + (to.zoom - from.zoom) * e,
    };
}

const running = new WeakMap<object, () => void>();

function prefersReducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    );
}

/**
 * Glide the camera to $to. A new glide, or the user touching the map,
 * stops the one in progress.
 */
export function flyTo(
    map: CameraMap,
    to: Camera,
    durationMs = DURATION_MS,
): void {
    running.get(map)?.();

    const c = map.getCenter();
    const from: Camera = {
        center: c ? { lat: c.lat(), lng: c.lng() } : to.center,
        zoom: map.getZoom() ?? to.zoom,
    };

    if (prefersReducedMotion() || durationMs <= 0) {
        map.moveCamera(to);

        return;
    }

    let frame = 0;
    let stopped = false;
    const start = performance.now();
    const touch = map.addListener?.('dragstart', () => stop());
    const stop = () => {
        stopped = true;
        cancelAnimationFrame(frame);
        touch?.remove();
        running.delete(map);
    };
    running.set(map, stop);

    const step = (now: number) => {
        if (stopped) {
            return;
        }

        const t = Math.min((now - start) / durationMs, 1);
        map.moveCamera(cameraAt(from, to, t));

        if (t < 1) {
            frame = requestAnimationFrame(step);
        } else {
            stop();
        }
    };

    frame = requestAnimationFrame(step);
}

/** Glide so that $bounds fill the map, minus $padding. */
export function flyToBounds(
    map: CameraMap,
    bounds: Bounds,
    padding: Padding,
    maxZoom = 16,
    durationMs = DURATION_MS,
): void {
    const div = map.getDiv();
    flyTo(
        map,
        cameraForBounds(
            bounds,
            div.clientWidth,
            div.clientHeight,
            padding,
            maxZoom,
        ),
        durationMs,
    );
}
