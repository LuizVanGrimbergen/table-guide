import { Head, Link } from '@inertiajs/react';
import { WifiOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { TableCard } from '@/components/tc/table-card';
import type { CheckerPlace, Choice } from '@/lib/availability';
import { longDate, PARTY_SIZES, timeOptions } from '@/lib/availability';
import { cn } from '@/lib/utils';

type Props = {
    restaurants: CheckerPlace[];
    today: string;
    initial: Choice;
};

const field =
    'h-12 w-full rounded-input border border-line-strong bg-paper px-4 text-base text-ink focus:border-ink focus:outline-none';

function useOnline(): boolean {
    const [online, setOnline] = useState(true);

    useEffect(() => {
        const update = () => setOnline(navigator.onLine);
        update();
        window.addEventListener('online', update);
        window.addEventListener('offline', update);

        return () => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
        };
    }, []);

    return online;
}

/**
 * Free tables: pick a date, time and party; each place in his checker shows
 * whether that time is free, with nearby times. Tapping opens the
 * restaurant's own booking page with the choice filled in. Never books.
 */
export default function TablesPage({ restaurants, today, initial }: Props) {
    const [date, setDate] = useState(initial.date);
    const [time, setTime] = useState(initial.time);
    const [party, setParty] = useState(initial.party);
    const online = useOnline();
    // One object per choice, so cards only ask again when something changed.
    const choice = useMemo<Choice>(
        () => ({ date, time, party }),
        [date, time, party],
    );

    // Keep the choice in the link, so Back and refresh keep it.
    useEffect(() => {
        const query = new URLSearchParams({ date, time, party: String(party) });
        window.history.replaceState(
            window.history.state,
            '',
            `/tables?${query}`,
        );
    }, [date, time, party]);

    return (
        <>
            <Head title="Free tables" />
            <div className="px-5 pt-3 md:px-0 md:pt-0">
                <p className="text-[13px] font-semibold tracking-wide text-brand uppercase">
                    {longDate(date)}
                </p>
                <h1 className="mt-1 font-serif text-[34px] leading-tight md:text-[36px]">
                    Free tables
                </h1>

                <div className="mt-5 grid grid-cols-2 gap-3">
                    <label className="block">
                        <span className="mb-1.5 block text-sm font-medium">
                            Date
                        </span>
                        <input
                            type="date"
                            value={date}
                            min={today}
                            onChange={(e) =>
                                e.target.value && setDate(e.target.value)
                            }
                            className={field}
                        />
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-sm font-medium">
                            Time
                        </span>
                        <select
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className={field}
                        >
                            {timeOptions(time).map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <section className="mt-5">
                    <h2 className="mb-2 text-sm font-medium">
                        How many people?
                    </h2>
                    <div
                        className="grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-1.5"
                        role="radiogroup"
                        aria-label="Number of people"
                    >
                        {PARTY_SIZES.map((n) => (
                            <button
                                key={n}
                                type="button"
                                role="radio"
                                aria-checked={party === n}
                                aria-label={n === 1 ? 'Just me' : `${n} people`}
                                onClick={() => setParty(n)}
                                className={cn(
                                    'h-12 rounded-[14px] border font-serif text-[20px] transition duration-120 active:scale-96',
                                    party === n
                                        ? 'border-ink bg-ink text-paper'
                                        : 'border-line-strong bg-paper',
                                )}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </section>

                {!online && (
                    <p className="mt-6 flex items-start gap-3 rounded-card bg-warm-tint p-4 text-[15px] text-quote">
                        <WifiOff
                            className="mt-0.5 size-5 shrink-0"
                            strokeWidth={1.6}
                        />
                        You're offline. Free times need the internet, so nothing
                        old is shown.
                    </p>
                )}

                {restaurants.length === 0 ? (
                    <div className="mt-8 rounded-card border border-dashed border-line-strong px-6 py-8 text-center">
                        <p className="font-serif text-[22px]">
                            No places to check yet
                        </p>
                        <p className="mt-2 text-[15px] text-ink-muted">
                            Open a place you like, then turn on "Show in my
                            table checker". Add its booking details there too.
                        </p>
                        <Link
                            href="/collection?status=fav&city=All"
                            className="mt-4 inline-flex h-11 items-center rounded-full border border-brand px-5 text-[15px] font-semibold text-brand"
                        >
                            Go to your favourites
                        </Link>
                    </div>
                ) : (
                    <ul className="mt-7 flex flex-col gap-3">
                        {restaurants.map((place) => (
                            <TableCard
                                key={place.restaurantId}
                                place={place}
                                choice={choice}
                                online={online}
                            />
                        ))}
                    </ul>
                )}

                <p className="mt-6 text-[13px] text-ink-muted">
                    Times come straight from each restaurant's booking system
                    and can change. Tapping a time opens their own page with it
                    filled in. Nothing is booked until you confirm there and the
                    restaurant confirms.
                </p>
            </div>
        </>
    );
}
