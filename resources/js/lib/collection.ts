/**
 * Collection logic shared by Home, Collection, Map and Tonight.
 * Ported from the behaviour in reference/prototype-mobile.dc.html.
 */

export type OccasionKey =
    | 'business_lunch'
    | 'special_occasions'
    | 'casual'
    | 'bars'
    | 'suburban';

export type GoodForKey =
    | 'groups'
    | 'clients'
    | 'wine_list'
    | 'views'
    | 'for_two'
    | 'drinks';

export type EntryStatus = 'been' | 'wish';

export type StatusFilter = 'all' | 'been' | 'wish' | 'fav';

export type Place = {
    id: number;
    restaurantId: number;
    name: string;
    city: string;
    area: string | null;
    cuisine: string | null;
    occasion: OccasionKey | null;
    goodFor: string[];
    status: EntryStatus;
    favourite: boolean;
    notRecommended: boolean;
    rating: number | null;
    note: string | null;
    website: string | null;
    lat: number | null;
    lng: number | null;
    verifyStatus: string | null;
    addedAt: string | null;
};

export const OCCASIONS: Record<OccasionKey, { label: string; hint: string }> = {
    business_lunch: {
        label: 'Business lunch',
        hint: 'Clients, work, long lunches',
    },
    special_occasions: {
        label: 'Special occasions',
        hint: 'Birthdays, anniversaries, the big night',
    },
    casual: { label: 'Casual', hint: 'Easy and relaxed' },
    bars: { label: 'Bars', hint: 'Just drinks' },
    suburban: { label: 'Suburban', hint: 'Close to home' },
};

export const OCCASION_KEYS = Object.keys(OCCASIONS) as OccasionKey[];

export const GOOD_FOR: Record<GoodForKey, string> = {
    groups: 'Groups',
    clients: 'Clients',
    wine_list: 'Wine list',
    views: 'Views',
    for_two: 'For two',
    drinks: 'Drinks',
};

export const GOOD_FOR_KEYS = Object.keys(GOOD_FOR) as GoodForKey[];

export const STATUS_FILTERS: Record<
    StatusFilter,
    { label: string; hint: string }
> = {
    all: { label: 'Been & wishlist', hint: 'Everything' },
    been: { label: 'Been there', hint: 'Places he knows' },
    wish: { label: 'Wishlist', hint: 'Still to try' },
    fav: { label: 'Favourites', hint: 'His best picks' },
};

export const ALL_CITIES = 'All';

export type Filters = {
    q: string;
    city: string; // a city name, or ALL_CITIES
    occasion: OccasionKey | null;
    status: StatusFilter;
    cuisines: string[];
    goodFor: GoodForKey[];
    hideNotRecommended: boolean;
};

export function defaultFilters(homeCity: string): Filters {
    return {
        q: '',
        city: homeCity,
        occasion: null,
        status: 'all',
        cuisines: [],
        goodFor: [],
        hideNotRecommended: false,
    };
}

/* ------------------------------------------------------------------ */
/* Smart search: "italian lunch surry hills" -> Italian + Business     */
/* lunch + Surry Hills. Unknown words become free text.                */
/* ------------------------------------------------------------------ */

const KEYWORDS: Record<
    string,
    ['occasion', OccasionKey] | ['good', GoodForKey]
> = {
    lunch: ['occasion', 'business_lunch'],
    business: ['occasion', 'business_lunch'],
    work: ['occasion', 'business_lunch'],
    corporate: ['occasion', 'business_lunch'],
    special: ['occasion', 'special_occasions'],
    occasion: ['occasion', 'special_occasions'],
    occasions: ['occasion', 'special_occasions'],
    fine: ['occasion', 'special_occasions'],
    dining: ['occasion', 'special_occasions'],
    bar: ['occasion', 'bars'],
    bars: ['occasion', 'bars'],
    drinks: ['occasion', 'bars'],
    casual: ['occasion', 'casual'],
    relaxed: ['occasion', 'casual'],
    suburban: ['occasion', 'suburban'],
    client: ['good', 'clients'],
    clients: ['good', 'clients'],
    visitors: ['good', 'clients'],
    group: ['good', 'groups'],
    groups: ['good', 'groups'],
    wine: ['good', 'wine_list'],
    view: ['good', 'views'],
    views: ['good', 'views'],
    two: ['good', 'for_two'],
    date: ['good', 'for_two'],
    cocktails: ['good', 'drinks'],
    whisky: ['good', 'drinks'],
    whiskey: ['good', 'drinks'],
};

const SKIP_WORDS = new Set([
    'list',
    'for',
    'with',
    'in',
    'a',
    'the',
    'and',
    'good',
    'place',
    'places',
    'restaurant',
    'restaurants',
    'near',
]);

export type ParsedQuery = {
    occasions: OccasionKey[];
    goodFor: GoodForKey[];
    cuisines: string[];
    cities: string[];
    areas: string[];
    words: string[];
    /** Human readable list for the "Showing: …" line. */
    labels: string[];
};

const EMPTY_PARSE: ParsedQuery = {
    occasions: [],
    goodFor: [],
    cuisines: [],
    cities: [],
    areas: [],
    words: [],
    labels: [],
};

function uniq(values: (string | null)[]): string[] {
    return [...new Set(values.filter((v): v is string => !!v))];
}

export function parseQuery(query: string, places: Place[]): ParsedQuery {
    let text = query.toLowerCase().trim();

    if (!text) {
        return EMPTY_PARSE;
    }

    const parsed: ParsedQuery = {
        occasions: [],
        goodFor: [],
        cuisines: [],
        cities: [],
        areas: [],
        words: [],
        labels: [],
    };

    // Longest areas first so "Surry Hills" wins over "Hills".
    const areas = uniq(places.map((p) => p.area)).sort(
        (a, b) => b.length - a.length,
    );

    for (const area of areas) {
        const lower = area.toLowerCase();

        if (lower.length > 2 && text.includes(lower)) {
            parsed.areas.push(area);
            parsed.labels.push(area);
            text = text.replace(lower, ' ');
        }
    }

    for (const city of uniq(places.map((p) => p.city))) {
        const lower = city.toLowerCase();

        if (text.includes(lower)) {
            parsed.cities.push(city);
            parsed.labels.push(city);
            text = text.replace(lower, ' ');
        }
    }

    for (const cuisine of uniq(places.map((p) => p.cuisine))) {
        const lower = cuisine.toLowerCase();

        if (lower.length > 2 && ` ${text} `.includes(` ${lower} `)) {
            parsed.cuisines.push(cuisine);
            parsed.labels.push(cuisine);
            text = text.replace(lower, ' ');
        }
    }

    for (const word of text.split(/\s+/)) {
        if (!word) {
            continue;
        }

        const key = KEYWORDS[word];

        if (key?.[0] === 'occasion') {
            if (!parsed.occasions.includes(key[1])) {
                parsed.occasions.push(key[1]);
                parsed.labels.push(OCCASIONS[key[1]].label);
            }
        } else if (key?.[0] === 'good') {
            if (!parsed.goodFor.includes(key[1])) {
                parsed.goodFor.push(key[1]);
                parsed.labels.push(GOOD_FOR[key[1]]);
            }
        } else if (!SKIP_WORDS.has(word)) {
            parsed.words.push(word);
        }
    }

    return parsed;
}

export function understoodLine(parsed: ParsedQuery): string {
    const parts = [...parsed.labels];

    if (parsed.words.length) {
        parts.push(`"${parsed.words.join(' ')}"`);
    }

    return parts.join(' · ');
}

/* ------------------------------------------------------------------ */
/* Filtering                                                           */
/* ------------------------------------------------------------------ */

export type FilterFacet =
    | 'status'
    | 'city'
    | 'occasion'
    | 'cuisine'
    | 'goodFor'
    | null;

export function matchesStatus(place: Place, status: StatusFilter): boolean {
    switch (status) {
        case 'been':
            return place.status === 'been';
        case 'wish':
            return place.status === 'wish';
        case 'fav':
            return place.favourite;
        default:
            return true;
    }
}

/**
 * Whether a place passes the filters. `skip` ignores one facet, used to
 * count how many places each option in that facet's sheet would show.
 */
export function matches(
    place: Place,
    filters: Filters,
    parsed: ParsedQuery,
    skip: FilterFacet = null,
): boolean {
    if (skip !== 'status' && !matchesStatus(place, filters.status)) {
        return false;
    }

    if (
        skip !== 'city' &&
        filters.city !== ALL_CITIES &&
        place.city !== filters.city
    ) {
        return false;
    }

    if (
        skip !== 'occasion' &&
        filters.occasion &&
        place.occasion !== filters.occasion
    ) {
        return false;
    }

    if (
        skip !== 'cuisine' &&
        filters.cuisines.length &&
        !filters.cuisines.includes(place.cuisine ?? '')
    ) {
        return false;
    }

    if (
        skip !== 'goodFor' &&
        !filters.goodFor.every((g) => place.goodFor.includes(g))
    ) {
        return false;
    }

    if (filters.hideNotRecommended && place.notRecommended) {
        return false;
    }

    // Smart search terms.
    if (
        parsed.occasions.length &&
        !parsed.occasions.includes(place.occasion as OccasionKey)
    ) {
        return false;
    }

    if (!parsed.goodFor.every((g) => place.goodFor.includes(g))) {
        return false;
    }

    if (
        parsed.cuisines.length &&
        !parsed.cuisines.includes(place.cuisine ?? '')
    ) {
        return false;
    }

    if (parsed.cities.length && !parsed.cities.includes(place.city)) {
        return false;
    }

    if (parsed.areas.length && !parsed.areas.includes(place.area ?? '')) {
        return false;
    }

    if (parsed.words.length) {
        const haystack = [
            place.name,
            place.city,
            place.area,
            place.cuisine,
            place.note,
            place.occasion ? OCCASIONS[place.occasion].label : null,
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        if (!haystack.includes(parsed.words.join(' '))) {
            return false;
        }
    }

    return true;
}

export function filterPlaces(places: Place[], filters: Filters): Place[] {
    const parsed = parseQuery(filters.q, places);

    return places
        .filter((p) => matches(p, filters, parsed))
        .sort((a, b) => a.name.localeCompare(b.name));
}

export function countWhere(
    places: Place[],
    filters: Filters,
    skip: FilterFacet,
    test: (p: Place) => boolean,
): number {
    const parsed = parseQuery(filters.q, places);

    return places.filter((p) => matches(p, filters, parsed, skip) && test(p))
        .length;
}

/** Number of active filters beyond the defaults (for the Reset button). */
export function isFiltered(filters: Filters, homeCity: string): boolean {
    return (
        filters.q.trim() !== '' ||
        filters.city !== homeCity ||
        filters.occasion !== null ||
        filters.status !== 'all' ||
        filters.cuisines.length > 0 ||
        filters.goodFor.length > 0 ||
        filters.hideNotRecommended
    );
}

export function moreCount(filters: Filters): number {
    return (
        filters.cuisines.length +
        filters.goodFor.length +
        (filters.hideNotRecommended ? 1 : 0)
    );
}

/* ------------------------------------------------------------------ */
/* Presentation helpers                                                */
/* ------------------------------------------------------------------ */

export type StatusInfo = {
    key: 'not_recommended' | 'favourite' | 'wish' | 'been';
    label: string;
    color: string;
};

export function statusOf(
    place: Pick<Place, 'notRecommended' | 'favourite' | 'status'>,
): StatusInfo {
    if (place.notRecommended) {
        return {
            key: 'not_recommended',
            label: 'Not recommended',
            color: '#7A6F66',
        };
    }

    if (place.favourite) {
        return { key: 'favourite', label: 'Favourite', color: '#8B2E3B' };
    }

    if (place.status === 'wish') {
        return { key: 'wish', label: 'Wishlist', color: '#8A6116' };
    }

    return { key: 'been', label: 'Been there', color: '#3F6B4E' };
}

export function placeLine(place: Pick<Place, 'area' | 'city'>): string {
    return place.area ? `${place.area}, ${place.city}` : place.city;
}

const TONES = [
    '#B5734F', // clay
    '#C29A5B', // ochre
    '#8A9A7B', // sage
    '#6E8094', // slate
    '#8B4A4F', // wine
    '#9C7A54', // bronze
    '#5E7563', // forest
    '#C08B7A', // rosewood
];

function hash(text: string): number {
    let h = 0;

    for (let i = 0; i < text.length; i++) {
        h = (h * 31 + text.charCodeAt(i)) | 0;
    }

    return Math.abs(h);
}

/** A calm, stable colour per restaurant until real photos arrive. */
export function toneFor(name: string): string {
    return TONES[hash(name) % TONES.length];
}

type Locatable = {
    name: string;
    area: string | null;
    city: string;
    lat?: number | null;
    lng?: number | null;
};

function locationQuery(place: Locatable): string {
    return [place.name, place.area, place.city].filter(Boolean).join(' ');
}

export function mapsSearchUrl(place: Locatable): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery(place))}`;
}

export function directionsUrl(place: Locatable): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(locationQuery(place))}`;
}

/** The restaurant's own site if we have it; otherwise a search for it. */
export function bookingUrl(place: Locatable & { website: string | null }): {
    url: string;
    isOwnSite: boolean;
} {
    if (place.website) {
        return { url: place.website, isOwnSite: true };
    }

    return {
        url: `https://www.google.com/search?q=${encodeURIComponent(`${locationQuery(place)} book a table`)}`,
        isOwnSite: false,
    };
}

/* ------------------------------------------------------------------ */
/* Tonight                                                             */
/* ------------------------------------------------------------------ */

export type Mood = {
    occasion: OccasionKey;
    label: string;
    hint: string;
};

export const MOODS: Mood[] = [
    {
        occasion: 'business_lunch',
        label: 'Business or clients',
        hint: 'Reliable, good for a work dinner',
    },
    {
        occasion: 'special_occasions',
        label: 'Something special',
        hint: 'Celebrations and the big night',
    },
    {
        occasion: 'casual',
        label: 'Easy and relaxed',
        hint: 'No fuss, good food',
    },
    {
        occasion: 'suburban',
        label: 'Close to home',
        hint: 'The suburbs',
    },
    { occasion: 'bars', label: 'Just drinks', hint: 'Bars and wine bars' },
];

/** His own places in the city, been there, recommended, for this mood. */
export function tonightCandidates(
    places: Place[],
    city: string,
    occasion: OccasionKey,
): Place[] {
    return places.filter(
        (p) =>
            p.city === city &&
            p.status === 'been' &&
            !p.notRecommended &&
            p.occasion === occasion,
    );
}

/**
 * Ranking: favourite +2, good for groups +3 when 6 or more guests,
 * has a note +1. Ties keep alphabetical order. Top 5.
 */
export function tonightPicks(
    places: Place[],
    city: string,
    occasion: OccasionKey,
    guests: number,
): Place[] {
    const score = (p: Place) =>
        (p.favourite ? 2 : 0) +
        (guests >= 6 && p.goodFor.includes('groups') ? 3 : 0) +
        (p.note ? 1 : 0);

    return tonightCandidates(places, city, occasion)
        .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))
        .slice(0, 5);
}

/* ------------------------------------------------------------------ */
/* Filters <-> URL (so Home tiles and the back button work)            */
/* ------------------------------------------------------------------ */

export function filtersFromParams(
    params: Record<string, unknown>,
    homeCity: string,
): Filters {
    const f = defaultFilters(homeCity);
    const str = (v: unknown) => (typeof v === 'string' ? v : '');
    const list = (v: unknown) =>
        str(v)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

    f.q = str(params.q);

    if (str(params.city)) {
        f.city = str(params.city);
    }

    if (str(params.occ) in OCCASIONS) {
        f.occasion = str(params.occ) as OccasionKey;
    }

    if (str(params.status) in STATUS_FILTERS) {
        f.status = str(params.status) as StatusFilter;
    }

    f.cuisines = list(params.cuisine);
    f.goodFor = list(params.good).filter((g): g is GoodForKey => g in GOOD_FOR);
    f.hideNotRecommended = ['1', 'true'].includes(str(params.hideAvoid));

    return f;
}

export function filtersToQuery(filters: Filters, homeCity: string): string {
    const params = new URLSearchParams();

    if (filters.q.trim()) {
        params.set('q', filters.q.trim());
    }

    if (filters.city !== homeCity) {
        params.set('city', filters.city);
    }

    if (filters.occasion) {
        params.set('occ', filters.occasion);
    }

    if (filters.status !== 'all') {
        params.set('status', filters.status);
    }

    if (filters.cuisines.length) {
        params.set('cuisine', filters.cuisines.join(','));
    }

    if (filters.goodFor.length) {
        params.set('good', filters.goodFor.join(','));
    }

    if (filters.hideNotRecommended) {
        params.set('hideAvoid', '1');
    }

    const query = params.toString();

    return query ? `?${query}` : '';
}

export type LatLng = { lat: number; lng: number };

/** Straight-line distance in km (haversine). Good enough for "how far". */
export function distanceKm(a: LatLng, b: LatLng): number {
    const rad = (d: number) => (d * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;

    return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** "450 m" under 1 km, "2.4 km" under 10 km, "14 km" above. */
export function formatDistance(km: number): string {
    if (km < 1) {
        return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
    }

    return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}
