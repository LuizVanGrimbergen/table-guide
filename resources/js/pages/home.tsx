import { Head, Link, router } from '@inertiajs/react';
import { ChevronRight, MapPin, Moon, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { AddSheet } from '@/components/tc/add-sheet';
import type { Received } from '@/components/tc/received-card';
import { ReceivedCard } from '@/components/tc/received-card';
import { RestaurantCard } from '@/components/tc/restaurant-card';
import type { OccasionKey, Place } from '@/lib/collection';
import { OCCASIONS } from '@/lib/collection';

type Props = { places: Place[]; homeCity: string; received: Received[] };

const TILES: { key: OccasionKey | 'fav'; hint: string }[] = [
    { key: 'business_lunch', hint: 'Clients and lunch' },
    { key: 'special_occasions', hint: 'Something special' },
    { key: 'casual', hint: 'Easy and relaxed' },
    { key: 'bars', hint: 'Just drinks' },
    { key: 'suburban', hint: 'Close to home' },
    { key: 'fav', hint: 'His best picks' },
];

export default function HomePage({ places, homeCity, received }: Props) {
    const [addOpen, setAddOpen] = useState(false);
    const local = places.filter((p) => p.city === homeCity);
    const favourites = local.filter((p) => p.favourite).slice(0, 8);
    const onMap = places.filter((p) => p.lat !== null).length;

    const tiles = TILES.map(({ key, hint }) => {
        if (key === 'fav') {
            return {
                key,
                label: 'Favourites',
                hint,
                count: favourites.length,
                href: `/collection?status=fav&hideAvoid=1`,
            };
        }

        return {
            key,
            label: OCCASIONS[key].label,
            hint,
            count: local.filter((p) => p.occasion === key && !p.notRecommended)
                .length,
            href: `/collection?occ=${key}&hideAvoid=1`,
        };
    });

    return (
        <>
            <Head title="Home" />
            <div className="flex flex-col gap-8 px-5 pt-3 md:px-0 md:pt-0">
                {/* Search + Add */}
                <div className="flex gap-2">
                    <label className="relative flex-1">
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
                    <button
                        type="button"
                        onClick={() => setAddOpen(true)}
                        className="flex h-[52px] shrink-0 items-center gap-1.5 rounded-full border border-ink px-5 text-[15px] font-semibold transition duration-120 active:scale-96 active:opacity-80"
                    >
                        <Plus className="size-5" strokeWidth={1.8} /> Add
                    </button>
                </div>

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
                            His best picks for this evening
                        </span>
                    </span>
                    <ChevronRight className="size-6" strokeWidth={1.5} />
                </Link>

                {/* Occasion tiles */}
                <section>
                    <h2 className="mb-3 font-serif text-[22px]">
                        Or browse by occasion
                    </h2>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        {tiles.map((t) => (
                            <Link
                                key={t.key}
                                href={t.href}
                                className="flex min-h-[96px] flex-col justify-between rounded-card border border-line bg-paper p-4 transition duration-120 active:scale-[.97] active:opacity-90"
                            >
                                <span className="flex items-start justify-between gap-2">
                                    <span className="font-serif text-[20px] leading-tight">
                                        {t.label}
                                    </span>
                                    <span className="text-sm text-ink-muted tabular-nums">
                                        {t.count}
                                    </span>
                                </span>
                                <span className="text-[13px] text-ink-muted">
                                    {t.hint}
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>

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
                        <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:px-0">
                            {favourites.map((p) => (
                                <div key={p.id} className="snap-start">
                                    <RestaurantCard place={p} compact />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Map preview */}
                <Link
                    href="/map"
                    className="flex min-h-[88px] items-center gap-4 rounded-card border border-line bg-paper p-5 transition duration-120 active:scale-[.98] active:opacity-90"
                >
                    <span className="flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand">
                        <MapPin className="size-6" strokeWidth={1.5} />
                    </span>
                    <span className="flex-1">
                        <span className="block font-serif text-[20px]">
                            Your map
                        </span>
                        <span className="block text-sm text-ink-muted">
                            {onMap > 0
                                ? `${onMap} places pinned`
                                : 'Pins appear once places are located'}
                        </span>
                    </span>
                    <ChevronRight
                        className="size-5 text-stone"
                        strokeWidth={1.5}
                    />
                </Link>

                {/* Circle */}
                <section>
                    <div className="mb-3 flex items-baseline justify-between">
                        <h2 className="font-serif text-[22px]">
                            From your circle
                        </h2>
                        <Link
                            href="/friends"
                            className="text-sm font-medium text-ink-muted"
                        >
                            My Circle
                        </Link>
                    </div>
                    {received.length > 0 ? (
                        <div className="grid gap-3 md:grid-cols-2">
                            {received.map((r) => (
                                <ReceivedCard key={r.id} rec={r} />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-card border border-dashed border-line-strong p-5 text-[15px] text-ink-muted">
                            When friends recommend a place, it shows up here
                            with a button to save it to your wishlist.{' '}
                            <Link
                                href="/friends"
                                className="font-medium text-ink underline underline-offset-4"
                            >
                                Invite friends
                            </Link>
                        </div>
                    )}
                </section>
            </div>
            <AddSheet open={addOpen} onOpenChange={setAddOpen} />
        </>
    );
}
