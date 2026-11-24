import { describe, expect, it } from 'vitest';
import {
    availabilityUrl,
    longDate,
    timeOptions,
    unknownReason,
} from './availability';

describe('table checker helpers', () => {
    it('offers every quarter hour from 11:00 to 22:45', () => {
        const times = timeOptions();

        expect(times[0]).toBe('11:00');
        expect(times[1]).toBe('11:15');
        expect(times.at(-1)).toBe('22:45');
        expect(times).toHaveLength(48);
    });

    it('keeps a chosen time that falls outside the list, in order', () => {
        const times = timeOptions('23:00');

        expect(times.at(-1)).toBe('23:00');
        expect(timeOptions('19:00')).toHaveLength(48);
    });

    it('never words an unknown answer as full', () => {
        for (const error of [
            'phone',
            'unreachable',
            'http_500',
            'failed',
            null,
        ]) {
            expect(
                unknownReason(error, 'SevenRooms').toLowerCase(),
            ).not.toContain('full');
        }

        expect(unknownReason('provider_unsupported', 'OpenTable')).toBe(
            "OpenTable can't be checked yet",
        );
    });

    it('formats the date without shifting a day', () => {
        expect(longDate('2026-11-28')).toBe('Saturday 28 November');
    });

    it('builds the lookup link', () => {
        expect(
            availabilityUrl(16, {
                date: '2026-11-28',
                time: '19:00',
                party: 4,
            }),
        ).toBe('/availability/16?date=2026-11-28&time=19%3A00&party=4');
    });
});
