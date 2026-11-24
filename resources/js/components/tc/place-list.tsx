import { Link } from '@inertiajs/react';
import { Heart } from 'lucide-react';
import type { Place } from '@/lib/collection';
import { ALL_CITIES, statusOf, toneFor } from '@/lib/collection';
import { cuisineIcon } from '@/lib/place-icons';
import { cn } from '@/lib/utils';

/** Below this many results the list is shown without area headings. */
const GROUP_FROM = 8;

/** Favourites, then been, then wishlist, then not recommended; then A–Z. */
function byBest(a: Place, b: Place): number {
    const rank = (p: Place) =>
        p.notRecommended ? 3 : p.favourite ? 0 : p.status === 'been' ? 1 : 2;

    return rank(a) - rank(b) || a.name.localeCompare(b.name);
}

type Group = { key: string; title: string; places: Place[]; mixed: boolean };

/**
 * Areas with two or more places get their own heading, biggest first. Areas
 * with a single place (and places without an area yet) share one group at
 * the end, so the page is not a wall of one-line headings.
 */
export function groupByArea(places: Place[], city: string): Group[] {
    const allCities = city === ALL_CITIES;
    const byArea = new Map<string, Place[]>();

    for (const p of places) {
        if (!p.area) {
            continue;
        }

        const key = allCities ? `${p.area}|${p.city}` : p.area;
        byArea.set(key, [...(byArea.get(key) ?? []), p]);
    }

    const groups: Group[] = [];
    const rest: Place[] = places.filter((p) => !p.area);

    for (const [key, list] of byArea) {
        if (list.length < 2) {
            rest.push(...list);
            continue;
        }

        const [area, inCity] = key.split('|');
        groups.push({
            key,
            title: inCity ? `${area}, ${inCity}` : area,
            places: list.sort(byBest),
            mixed: false,
        });
    }

    groups.sort(
        (a, b) =>
            b.places.length - a.places.length || a.title.localeCompare(b.title),
    );

    if (rest.length) {
        groups.push({
            key: 'rest',
            title: allCities ? 'Elsewhere' : `Around ${city}`,
            places: rest.sort(byBest),
            mixed: true,
        });
    }

    return groups;
}

/** His places as compact rows, grouped under area headings. */
export function PlaceList({ places, city }: { places: Place[]; city: string }) {
    if (places.length < GROUP_FROM) {
        return (
            <ul className="divide-y divide-line">
                {[...places].sort(byBest).map((p) => (
                    <li key={p.id}>
                        <PlaceRow place={p} showArea />
                    </li>
                ))}
            </ul>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {groupByArea(places, city).map((g) => (
                <section key={g.key} aria-label={g.title}>
                    <h2 className="sticky top-0 z-10 -mx-5 flex items-baseline gap-2 bg-ivory/95 px-5 py-2 backdrop-blur md:mx-0 md:px-0">
                        <span className="font-serif text-[21px]">
                            {g.title}
                        </span>
                        <span className="text-sm text-ink-muted tabular-nums">
                            {g.places.length}
                        </span>
                    </h2>
                    <ul className="divide-y divide-line">
                        {g.places.map((p) => (
                            <li key={p.id}>
                                <PlaceRow place={p} showArea={g.mixed} />
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}

/** One place: cuisine icon, status dot, name, his note, cuisine (· area). */
export function PlaceRow({
    place,
    showArea,
}: {
    place: Place;
    showArea?: boolean;
}) {
    const Icon = cuisineIcon(place.cuisine);
    const status = statusOf(place);
    const meta = [place.cuisine, showArea ? place.area : null]
        .filter(Boolean)
        .join(' · ');

    return (
        <Link
            href={`/restaurants/${place.restaurantId}`}
            className={cn(
                'flex min-h-[76px] items-center gap-3.5 py-3 transition active:opacity-70',
                place.notRecommended && 'opacity-60',
            )}
        >
            <span
                aria-hidden
                className="flex size-[52px] shrink-0 items-center justify-center rounded-[14px]"
                style={{ background: toneFor(place.name) }}
            >
                <Icon className="size-6 text-white/90" strokeWidth={1.3} />
            </span>
            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                    <span
                        className="size-2 shrink-0 rounded-full"
                        title={status.label}
                        style={{
                            background:
                                status.key === 'wish'
                                    ? 'transparent'
                                    : status.color,
                            border: `1.5px solid ${status.color}`,
                        }}
                    />
                    <span className="truncate font-serif text-[19px] leading-tight">
                        {place.name}
                    </span>
                    {place.favourite && (
                        <Heart
                            aria-label="Favourite"
                            className="size-3.5 shrink-0 text-warm"
                            fill="currentColor"
                            strokeWidth={1.5}
                        />
                    )}
                </span>
                {place.note && (
                    <span className="mt-0.5 block truncate font-serif text-[16px] text-quote italic">
                        {place.note}
                    </span>
                )}
                {meta && (
                    <span className="mt-0.5 block truncate text-[13px] text-ink-muted">
                        {meta}
                    </span>
                )}
                <span className="sr-only">{status.label}</span>
            </span>
        </Link>
    );
}
