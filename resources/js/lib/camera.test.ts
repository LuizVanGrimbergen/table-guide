import { describe, expect, it } from 'vitest';
import { cameraAt, cameraForBounds, easeInOut } from './camera';

const none = { top: 0, bottom: 0, left: 0, right: 0 };

describe('map camera', () => {
    it('fits a box: a 1 km wide area at Sydney is about zoom 15.6 on a phone', () => {
        // ~0.011 degrees longitude is ~1 km at Sydney.
        const cam = cameraForBounds(
            { north: -33.865, south: -33.875, east: 151.215, west: 151.204 },
            390,
            700,
            none,
            19,
        );

        // 390 px / (256 px * 0.011/360 of the world) = 2^15.6
        expect(cam.zoom).toBeCloseTo(15.6, 1);
        expect(cam.center.lat).toBeCloseTo(-33.87, 3);
        expect(cam.center.lng).toBeCloseTo(151.2095, 3);
    });

    it('zooms out further when padding takes room', () => {
        const box = { north: -33.8, south: -33.95, east: 151.3, west: 151.1 };

        expect(
            cameraForBounds(box, 390, 700, {
                top: 190,
                bottom: 150,
                left: 40,
                right: 40,
            }).zoom,
        ).toBeLessThan(cameraForBounds(box, 390, 700, none).zoom);
    });

    it('shifts the centre so the pins sit in the free area', () => {
        const box = { north: -33.86, south: -33.88, east: 151.22, west: 151.2 };
        const plain = cameraForBounds(box, 390, 700, none);
        const tallTop = cameraForBounds(box, 390, 700, {
            top: 200,
            bottom: 0,
            left: 0,
            right: 0,
        });

        // More room taken at the top: the camera looks a little further north.
        expect(tallTop.center.lat).toBeGreaterThan(plain.center.lat);
    });

    it('never zooms closer than the limit for a single spot', () => {
        const spot = { north: -33.87, south: -33.87, east: 151.2, west: 151.2 };

        expect(cameraForBounds(spot, 390, 700, none, 16).zoom).toBe(16);
    });

    it('eases from start to end', () => {
        expect(easeInOut(0)).toBe(0);
        expect(easeInOut(1)).toBe(1);
        expect(easeInOut(0.5)).toBeCloseTo(0.5);
        expect(easeInOut(0.1)).toBeLessThan(0.1);
    });

    it('moves centre and zoom together', () => {
        const from = { center: { lat: -33.87, lng: 151.2 }, zoom: 12 };
        const to = { center: { lat: -33.89, lng: 151.25 }, zoom: 15 };

        const start = cameraAt(from, to, 0);
        expect(start.zoom).toBe(12);
        expect(start.center.lat).toBeCloseTo(-33.87, 9);
        expect(start.center.lng).toBeCloseTo(151.2, 9);
        expect(cameraAt(from, to, 1).zoom).toBe(15);
        expect(cameraAt(from, to, 1).center.lng).toBeCloseTo(151.25);
        expect(cameraAt(from, to, 1).center.lat).toBeCloseTo(-33.89);

        const mid = cameraAt(from, to, 0.5);
        expect(mid.zoom).toBeCloseTo(13.5);
    });
});
