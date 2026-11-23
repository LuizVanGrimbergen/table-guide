import { Head, Link, router } from '@inertiajs/react';
import { ChevronRight, Moon, Search } from 'lucide-react';
import type { Received } from '@/components/tc/received-card';
import { ReceivedCard } from '@/components/tc/received-card';
import { FavouriteTile } from '@/components/tc/favourite-tile';
import type { OccasionKey, Place } from '@/lib/collection';
import { OCCASIONS } from '@/lib/collection';

type Props = { places: Place[]; homeCity: string; received: Received[] };

const OCCASION_ORDER: OccasionKey[] = [
    'business_lunch',
    'special_occasions',
    'casual',
    'bars',
    'suburban',
];

/**
 * Home is deliberately calm: search, one big "Tonight" button, his favourites
 * and a short list of occasions. Add and Map already live in the navigation,
 * so they are not repeated here. Friends' recommendations only appear when
 * there are any.
 */
export default function HomePage({ places, homeCity, received }: Props) {
    const local = places.filter((p) => p.city === homeCity);
    const favourites = local.filter((p) => p.favourite).slice(0, 8);

    const rows = OCCASION_ORDER.map((key) => ({
        key,
        label: OCCASIONS[key].label,
        count: local.filter((p) => p.occasion === key && !p.notRecommended)
            .length,
        href: `/collection?occ=${key}&hideAvoid=1`,
    }));

    return (
        <>
            <Head title="Home" />
            <div className="flex flex-col gap-8 px-5 pt-3 md:px-0 md:pt-0">
                {/* Search */}
                <label className="relative">
                    <span className="sr-only">Search your collection</span>
                    <Search
                        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-muted"
                        strokeWidth={1.6}
                    />
                    <input
                        type="search"
                        placeholder="Search your places"
                        className="h-[52px] w-full rounded-full border border-line-strong bg-paper pr-4 pl-12 text-base placeholder:text-ink-muted focus:border-ink focus:outline-none"
                        onChange={(e) =>
                            router.visit(
                                `/collection?q=${encodeURIComponent(e.target.value)}&focus=1`,
                            )
                        }
                    />
                </label>

                {/* Tonight */}
                <Link
                    href="/tonight"
                    className="flex min-h-[76px] items-center gap-4 rounded-card bg-brand px-6 text-paper transition duration-120 active:scale-[.98] active:opacity-90"
                >
                    <Moon className="size-6 shrink-0" strokeWidth={1.5} />
                    <span className="flex-1">
                        <span className="block font-serif text-[24px] leading-tight">
                            Where to tonight?
                        </span>
                        <span className="block text-sm text-paper/75">
                            Your best picks for this evening
                        </span>
                    </span>
                    <ChevronRight className="size-6" strokeWidth={1.5} />
                </Link>

                {/* Favourites */}
                {favourites.length > 0 && (
                    <section>
                        <div className="mb-3 flex items-baseline justify-between">
                            <h2 className="font-serif text-[22px]">
                                Favourites
                            </h2>
                            <Link
                                href="/collection?status=fav&city=All"
                                className="text-sm font-medium text-ink-muted"
                            >
                                See all
                            </Link>
                        </div>
                        <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
                            {favourites.map((p) => (
                                <div key={p.id} className="snap-start">
                                    <FavouriteTile place={p} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Occasions: a plain list, easy to scan */}
                <section>
                    <h2 className="mb-1 font-serif text-[22px]">
                        Browse by occasion
                    </h2>
                    <ul className="divide-y divide-line">
                        {rows.map((r) => (
                            <li key={r.key}>
                                <Link
                                    href={r.href}
                                    className="flex min-h-[56px] items-center gap-3 py-2 transition duration-120 active:opacity-70"
                                >
                                    <span className="flex-1 text-[17px]">
                                        {r.label}
                                    </span>
                                    <span className="text-[15px] text-ink-muted tabular-nums">
                                        {r.count}
                                    </span>
                                    <ChevronRight
                                        className="size-5 text-stone"
                                        strokeWidth={1.5}
                                    />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Friends' recommendations, only when there are some */}
                {received.length > 0 && (
                    <section>
                        <div className="mb-3 flex items-baseline justify-between">
                            <h2 className="font-serif text-[22px]">
                                From your circle
                            </h2>
                            {received.length > 2 && (
                                <Link
                                    href="/friends"
                                    className="text-sm font-medium text-ink-muted"
                                >
                                    See all
                                </Link>
                            )}
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            {received.slice(0, 2).map((r) => (
                                <ReceivedCard key={r.id} rec={r} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </>
    );
}
