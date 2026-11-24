/**
 * The table checker: types for /availability answers, the time choices,
 * and the words for each kind of "we don't know".
 */

export type AvailabilityStatus =
    | 'available'
    | 'alternative'
    | 'full'
    | 'unknown';

export type Slot = { time: string; bookingUrl: string | null };

export type Availability = {
    restaurantId: number;
    name: string;
    area: string | null;
    cuisine: string | null;
    provider: string;
    providerLabel: string;
    phone: string | null;
    status: AvailabilityStatus;
    error: string | null;
    requested: Slot | null;
    nearest: Slot[];
    bookingUrl: string | null;
};

/** What the page knows before any lookup: enough to draw the card. */
export type CheckerPlace = Pick<
    Availability,
    'restaurantId' | 'name' | 'area' | 'cuisine' | 'providerLabel' | 'phone'
>;

export type Choice = { date: string; time: string; party: number };

export const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8];

/** Every quarter hour from 11:00 to 22:45, plus $keep if it falls outside. */
export function timeOptions(keep?: string): string[] {
    const times: string[] = [];

    for (let m = 11 * 60; m <= 22 * 60 + 45; m += 15) {
        times.push(
            `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`,
        );
    }

    if (keep && !times.includes(keep)) {
        times.push(keep);
        times.sort();
    }

    return times;
}

/** Why we can't say, in his words. Never suggests a place is full. */
export function unknownReason(
    error: string | null,
    providerLabel: string,
): string {
    switch (error) {
        case 'phone':
            return 'Books by phone';
        case 'no_online_booking':
            return 'No booking system set. Add it under Booking details.';
        case 'not_configured':
            return 'Live times are not set up yet';
        case 'no_venue_id':
            return 'Venue ID missing. Add it under Booking details.';
        case 'provider_unsupported':
            return `${providerLabel} doesn't let us check free times. Open their page to see.`;
        case 'unreachable':
            return "Their booking system didn't answer";
        case 'rate_limited':
            return 'Checked a moment ago. Try again in a minute.';
        default:
            return "Couldn't read their booking system";
    }
}

/** "Saturday 28 November" from "2026-11-28", without timezone surprises. */
export function longDate(date: string): string {
    const [y, m, d] = date.split('-').map(Number);

    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-AU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
    });
}

export function availabilityUrl(restaurantId: number, choice: Choice): string {
    const query = new URLSearchParams({
        date: choice.date,
        time: choice.time,
        party: String(choice.party),
    });

    return `/availability/${restaurantId}?${query}`;
}
