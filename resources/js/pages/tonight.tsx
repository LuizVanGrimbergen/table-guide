import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { BottomSheet } from '@/components/tc/bottom-sheet';
import { TonightHelper } from '@/components/tc/tonight-helper';
import type { OccasionKey, Place } from '@/lib/collection';
import {
    bookingUrl,
    directionsUrl,
    MOODS,
    placeLine,
    tonightCandidates,
    tonightPicks,
} from '@/lib/collection';
import { cn } from '@/lib/utils';

type Props = { places: Place[]; homeCity: string; aiEnabled: boolean };

const GUESTS = [2, 3, 4, 5, 6, 8];

export default function TonightPage({ places, homeCity, aiEnabled }: Props) {
    const [guests, setGuests] = useState(4);
    const [mood, setMood] = useState<OccasionKey>('business_lunch');
    const [booking, setBooking] = useState<Place | null>(null);
    const picks = tonightPicks(places, homeCity, mood, guests);
    const all = tonightCandidates(places, homeCity, mood).length;
    const today = new Date().toLocaleDateString('en-AU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });

    return (
        <>
            <Head title="Tonight" />
            <div className="px-5 pt-3 md:px-0 md:pt-0">
                <p className="text-[13px] font-semibold tracking-wide text-brand uppercase">
                    {today} · {homeCity}
                </p>
                <h1 className="mt-1 font-serif text-[34px] leading-tight md:text-[36px]">
                    Dinner tonight
                </h1>
                <section className="mt-6">
                    <h2 className="mb-3 text-[15px] font-semibold">
                        How many people?
                    </h2>
                    <div
                        className="grid grid-cols-6 gap-2"
                        role="radiogroup"
                        aria-label="Number of people"
                    >
                        {GUESTS.map((n) => (
                            <button
                                key={n}
                                type="button"
                                role="radio"
                                aria-checked={guests === n}
                                aria-label={
                                    n === 8 ? '8 or more people' : `${n} people`
                                }
                                onClick={() => setGuests(n)}
                                className={cn(
                                    'h-[52px] rounded-[14px] border font-serif text-[22px] transition duration-120 active:scale-96',
                                    guests === n
                                        ? 'border-ink bg-ink text-paper'
                                        : 'border-line-strong bg-paper',
                                )}
                            >
                                {n === 8 ? '8+' : n}
                            </button>
                        ))}
                    </div>
                </section>

                <div className="mt-7">
                    <TonightHelper
                        places={places}
                        city={homeCity}
                        guests={guests}
                        aiEnabled={aiEnabled}
                    />
                </div>

                <section className="mt-7">
                    <h2 className="mb-3 text-[15px] font-semibold">
                        What kind of evening?
                    </h2>
                    <div
                        className="flex flex-col gap-2"
                        role="radiogroup"
                        aria-label="Kind of evening"
                    >
                        {MOODS.map((m) => {
                            const on = mood === m.occasion;
                            const n = tonightCandidates(
                                places,
                                homeCity,
                                m.occasion,
                            ).length;

                            return (
                                <button
                                    key={m.occasion}
                                    type="button"
                                    role="radio"
                                    aria-checked={on}
                                    onClick={() => setMood(m.occasion)}
                                    className={cn(
                                        'flex min-h-16 items-center gap-3 rounded-card border px-4 py-2.5 text-left transition duration-120 active:scale-[.98]',
                                        on
                                            ? 'border-brand bg-brand text-paper'
                                            : 'border-line bg-paper',
                                    )}
                                >
                                    <span className="flex-1">
                                        <span className="block text-[17px] font-medium">
                                            {m.label}
                                        </span>
                                        <span
                                            className={cn(
                                                'block text-[13px]',
                                                on
                                                    ? 'text-paper/75'
                                                    : 'text-ink-muted',
                                            )}
                                        >
                                            {m.hint}
                                        </span>
                                    </span>
                                    <span
                                        className={cn(
                                            'text-sm tabular-nums',
                                            on
                                                ? 'text-paper/80'
                                                : 'text-ink-muted',
                                        )}
                                    >
                                        {n}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section className="mt-8" aria-live="polite">
                    <h2 className="mb-3 font-serif text-[24px]">
                        His top picks
                    </h2>
                    {picks.length === 0 ? (
                        <p className="rounded-card border border-dashed border-line-strong p-5 text-[15px] text-ink-muted">
                            None of his been-there places in {homeCity} fit this
                            evening yet.
                        </p>
                    ) : (
                        <ol className="flex flex-col gap-3">
                            {picks.map((p, i) => (
                                <li
                                    key={p.id}
                                    className="rounded-card border border-line bg-paper p-4"
                                >
                                    <div className="flex gap-3">
                                        <span
                                            className={cn(
                                                'flex size-9 shrink-0 items-center justify-center rounded-full font-serif text-[18px]',
                                                i === 0
                                                    ? 'bg-brand text-paper'
                                                    : 'bg-sand',
                                            )}
                                        >
                                            {i + 1}
                                        </span>
                                        <Link
                                            href={`/restaurants/${p.restaurantId}`}
                                            className="min-w-0 flex-1"
                                        >
                                            <span className="block font-serif text-[22px] leading-tight">
                                                {p.name}
                                            </span>
                                            <span className="block text-sm text-ink-muted">
                                                {placeLine(p)}
                                            </span>
                                            {p.note && (
                                                <span className="mt-1.5 block font-serif text-[17px] leading-snug text-quote italic">
                                                    {p.note}
                                                </span>
                                            )}
                                        </Link>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setBooking(p)}
                                            className="h-12 rounded-full bg-ink text-[15px] font-semibold text-paper transition duration-120 active:scale-96"
                                        >
                                            Book a table
                                        </button>
                                        <a
                                            href={directionsUrl(p)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex h-12 items-center justify-center rounded-full border border-ink text-[15px] font-semibold transition duration-120 active:scale-96"
                                        >
                                            Directions
                                        </a>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}

                    {all > 0 && (
                        <Link
                            href={`/collection?occ=${mood}&status=been&hideAvoid=1`}
                            className="mt-4 flex h-12 items-center justify-center text-[15px] font-medium underline underline-offset-4"
                        >
                            See all {all} in the Collection
                        </Link>
                    )}
                </section>

                <p className="mt-6 text-[13px] text-ink-muted">
                    Book opens the restaurant's own page. Live table times come
                    later.
                </p>
            </div>

            <BottomSheet
                open={booking !== null}
                onOpenChange={(o) => !o && setBooking(null)}
                title="Book a Table"
                description={
                    booking
                        ? `${booking.name} · ${guests === 8 ? '8+' : guests} people`
                        : undefined
                }
            >
                {booking && (
                    <>
                        <a
                            href={bookingUrl(booking).url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-[52px] items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-paper"
                        >
                            {bookingUrl(booking).isOwnSite
                                ? 'Open their booking page'
                                : 'Find their booking page'}
                        </a>
                        <p className="mt-5 rounded-card bg-warm-tint p-4 text-[14px] text-quote">
                            Nothing is booked until the restaurant confirms. We
                            can't see live tables yet.
                        </p>
                    </>
                )}
            </BottomSheet>
        </>
    );
}
