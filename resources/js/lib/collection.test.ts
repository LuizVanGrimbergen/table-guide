import { describe, expect, it } from 'vitest';
import { googleCalendarUrl, icsFile } from './calendar';
import type { DinnerPlan } from './calendar';
import type { Place } from './collection';
import {
    defaultFilters,
    filterPlaces,
    filtersFromParams,
    filtersToQuery,
    parseQuery,
    statusOf,
    tonightPicks,
    understoodLine,
} from './collection';

let nextId = 1;

function place(overrides: Partial<Place>): Place {
    return {
        id: nextId++,
        restaurantId: nextId,
        name: 'Somewhere',
        city: 'Sydney',
        area: 'CBD',
        cuisine: null,
        occasion: 'casual',
        goodFor: [],
        status: 'been',
        favourite: false,
        notRecommended: false,
        inChecker: false,
        rating: null,
        note: null,
        website: null,
        bookingUrl: null,
        lat: null,
        lng: null,
        verifyStatus: null,
        addedAt: null,
        ...overrides,
    };
}

const places: Place[] = [
    place({
        name: 'Fratelli',
        area: 'Surry Hills',
        cuisine: 'Italian',
        occasion: 'business_lunch',
        goodFor: ['clients'],
        favourite: true,
        note: 'Best pasta',
    }),
    place({
        name: 'Nomad',
        area: 'Surry Hills',
        cuisine: 'Middle Eastern',
        occasion: 'business_lunch',
    }),
    place({
        name: 'Pizza Spot',
        area: 'Newtown',
        cuisine: 'Italian',
        occasion: 'casual',
    }),
    place({
        name: 'Glenmore',
        area: 'The Rocks',
        cuisine: 'Pub',
        occasion: 'bars',
        notRecommended: true,
        note: 'Stay away from food',
    }),
    place({
        name: 'Dream List',
        area: 'Paddington',
        occasion: 'special_occasions',
        status: 'wish',
    }),
    place({
        name: 'Ghent Bistro',
        city: 'Ghent',
        area: null,
        cuisine: 'Belgian',
        occasion: 'casual',
    }),
];

describe('smart search', () => {
    it('maps words to filters', () => {
        const parsed = parseQuery('italian lunch surry hills', places);

        expect(parsed.areas).toEqual(['Surry Hills']);
        expect(parsed.cuisines).toEqual(['Italian']);
        expect(parsed.occasions).toEqual(['business_lunch']);
        expect(parsed.words).toEqual([]);
        expect(understoodLine(parsed)).toBe(
            'Surry Hills · Italian · Business lunch',
        );
    });

    it('finds the matching places', () => {
        const result = filterPlaces(places, {
            ...defaultFilters('Sydney'),
            q: 'italian lunch surry hills',
        });

        expect(result.map((p) => p.name)).toEqual(['Fratelli']);
    });

    it('keeps unknown words as free text over name and note', () => {
        expect(
            filterPlaces(places, {
                ...defaultFilters('Sydney'),
                q: 'pasta',
            }).map((p) => p.name),
        ).toEqual(['Fratelli']);
        expect(
            filterPlaces(places, {
                ...defaultFilters('Sydney'),
                q: 'glen',
            }).map((p) => p.name),
        ).toEqual(['Glenmore']);
    });

    it('skips filler words and understands good-for words', () => {
        const parsed = parseQuery('a good place for clients', places);

        expect(parsed.goodFor).toEqual(['clients']);
        expect(parsed.words).toEqual([]);
    });
});

describe('filters', () => {
    it('defaults to the home city', () => {
        expect(filterPlaces(places, defaultFilters('Sydney'))).toHaveLength(5);
        expect(
            filterPlaces(places, { ...defaultFilters('Sydney'), city: 'All' }),
        ).toHaveLength(6);
    });

    it('filters by status, favourites and occasion', () => {
        const base = defaultFilters('Sydney');

        expect(
            filterPlaces(places, { ...base, status: 'wish' }).map(
                (p) => p.name,
            ),
        ).toEqual(['Dream List']);
        expect(
            filterPlaces(places, { ...base, status: 'fav' }).map((p) => p.name),
        ).toEqual(['Fratelli']);
        expect(
            filterPlaces(places, { ...base, occasion: 'business_lunch' }),
        ).toHaveLength(2);
    });

    it('can hide places he does not recommend', () => {
        const result = filterPlaces(places, {
            ...defaultFilters('Sydney'),
            hideNotRecommended: true,
        });

        expect(result.map((p) => p.name)).not.toContain('Glenmore');
    });

    it('requires every chosen good-for tag', () => {
        expect(
            filterPlaces(places, {
                ...defaultFilters('Sydney'),
                goodFor: ['clients'],
            }).map((p) => p.name),
        ).toEqual(['Fratelli']);
    });

    it('round-trips through the URL', () => {
        const f = {
            ...defaultFilters('Sydney'),
            occasion: 'bars' as const,
            hideNotRecommended: true,
            cuisines: ['Pub'],
        };
        const query = filtersToQuery(f, 'Sydney');

        expect(query).toBe('?occ=bars&cuisine=Pub&hideAvoid=1');
        expect(
            filtersFromParams(
                Object.fromEntries(new URLSearchParams(query)),
                'Sydney',
            ),
        ).toEqual(f);
    });
});

describe('status', () => {
    it('not recommended wins over favourite, favourite over wishlist', () => {
        expect(
            statusOf({ notRecommended: true, favourite: true, status: 'been' })
                .label,
        ).toBe('Not recommended');
        expect(
            statusOf({ notRecommended: false, favourite: true, status: 'wish' })
                .label,
        ).toBe('Favourite');
        expect(
            statusOf({
                notRecommended: false,
                favourite: false,
                status: 'wish',
            }).label,
        ).toBe('Wishlist');
    });
});

describe('tonight', () => {
    const lunch = [
        place({ name: 'A Plain' }),
        place({ name: 'B Noted', note: 'Lovely' }),
        place({ name: 'C Favourite', favourite: true }),
        place({ name: 'D Groups', goodFor: ['groups'] }),
        place({ name: 'E Avoid', notRecommended: true, favourite: true }),
        place({ name: 'F Wish', status: 'wish', favourite: true }),
        place({ name: 'G Melbourne', city: 'Melbourne', favourite: true }),
    ].map((p) => ({ ...p, occasion: 'business_lunch' as const }));

    it('ranks favourites first, then notes, and skips wishlist, not recommended and other cities', () => {
        expect(
            tonightPicks(lunch, 'Sydney', 'business_lunch', 4).map(
                (p) => p.name,
            ),
        ).toEqual(['C Favourite', 'B Noted', 'A Plain', 'D Groups']);
    });

    it('lifts places good for groups when 6 or more are coming', () => {
        expect(tonightPicks(lunch, 'Sydney', 'business_lunch', 6)[0].name).toBe(
            'D Groups',
        );
    });
});

describe('calendar', () => {
    const plan: DinnerPlan = {
        name: 'Fratelli, Paradiso',
        area: 'Potts Point',
        city: 'Sydney',
        date: '2026-12-31',
        time: '23:00',
        timezone: 'Australia/Sydney',
        confirmed: false,
        mapsUrl: 'https://maps.example',
        uid: '1',
    };

    it('marks a proposed dinner as tentative and never as booked', () => {
        const ics = icsFile(plan, new Date('2026-11-24T00:00:00Z'));

        expect(ics).toContain('STATUS:TENTATIVE');
        expect(ics).toContain('SUMMARY:Proposed dinner: Fratelli\\, Paradiso');
        expect(ics).toContain('No table booked yet.');
        expect(ics).toContain('DTSTART;TZID=Australia/Sydney:20261231T230000');
        expect(ics).toContain('DTEND;TZID=Australia/Sydney:20270101T010000');
    });

    it('escapes commas and semicolons in event text', () => {
        expect(icsFile({ ...plan, name: 'Bar; Grill' })).toContain(
            'SUMMARY:Proposed dinner: Bar\\; Grill',
        );
    });

    it('only says confirmed when he marks it confirmed', () => {
        expect(icsFile({ ...plan, confirmed: true })).toContain(
            'STATUS:CONFIRMED',
        );
        expect(
            decodeURIComponent(
                googleCalendarUrl({ ...plan, confirmed: true }).replace(
                    /\+/g,
                    ' ',
                ),
            ),
        ).toContain('Dinner at Fratelli');
    });
});
