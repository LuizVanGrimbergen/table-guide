import { Link } from '@inertiajs/react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Place } from '@/lib/collection';
import { bookingUrl, directionsUrl, placeLine } from '@/lib/collection';
import { cn } from '@/lib/utils';
import { BottomSheet } from './bottom-sheet';
import { ChoiceRow } from './choice-row';

type Company = 'clients' | 'friends' | 'partner' | 'family';
type Mood = 'sure' | 'new' | 'special' | 'relaxed' | 'drinks';

type Pick = {
    id: number;
    restaurantId: number;
    name: string;
    area: string | null;
    city: string;
    website: string | null;
    headline: string;
    why: string;
    status: 'been' | 'wish';
};

type Result = { source: 'ai' | 'rules'; intro: string; picks: Pick[] };

const COMPANY: { value: Company; label: string; hint: string }[] = [
    {
        value: 'clients',
        label: 'Clients or work',
        hint: 'Somewhere that impresses',
    },
    { value: 'friends', label: 'Friends', hint: 'Lively, good for sharing' },
    { value: 'partner', label: 'Just the two of us', hint: 'For two' },
    { value: 'family', label: 'Family', hint: 'Easy for everyone' },
];

const MOOD: { value: Mood; label: string; hint: string }[] = [
    { value: 'sure', label: 'A sure thing', hint: 'A place you know is good' },
    { value: 'new', label: 'Somewhere new', hint: 'From your wishlist' },
    { value: 'special', label: 'Something special', hint: 'The big night' },
    { value: 'relaxed', label: 'Easy and relaxed', hint: 'No fuss' },
    { value: 'drinks', label: 'Mostly drinks', hint: 'Bars and wine' },
];

function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);

    return match ? decodeURIComponent(match[1]) : '';
}

/**
 * "Help me choose": three quick questions, then up to three of his own
 * places with the reasons why. Claude picks when configured; otherwise the
 * rule-based matcher on the server answers.
 */
export function TonightHelper({
    places,
    city,
    guests,
    aiEnabled,
}: {
    places: Place[];
    city: string;
    guests: number;
    aiEnabled: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(0);
    const [cuisine, setCuisine] = useState<string | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    const [mood, setMood] = useState<Mood | null>(null);
    const [wish, setWish] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<Result | null>(null);

    // His own cuisines in this city, most common first.
    const cuisines = useMemo(() => {
        const counts = new Map<string, number>();

        for (const p of places) {
            if (p.city === city && p.cuisine && !p.notRecommended) {
                counts.set(p.cuisine, (counts.get(p.cuisine) ?? 0) + 1);
            }
        }

        return [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([c]) => c);
    }, [places, city]);

    const start = () => {
        setStep(0);
        setError(null);
        setOpen(true);
    };

    const ask = async () => {
        setOpen(false);
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/tonight/suggest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': xsrfToken(),
                },
                body: JSON.stringify({
                    city,
                    guests,
                    cuisine,
                    company,
                    mood,
                    wish,
                }),
            });

            if (!res.ok) {
                throw new Error(res.status === 429 ? 'busy' : 'failed');
            }

            setResult((await res.json()) as Result);
        } catch (e) {
            setError(
                (e as Error).message === 'busy'
                    ? 'Too many tries in a minute. Wait a moment and try again.'
                    : 'Something went wrong. Try again in a moment.',
            );
        } finally {
            setLoading(false);
        }
    };

    const next = () => (step < 2 ? setStep(step + 1) : void ask());

    return (
        <section aria-live="polite">
            {!result && !loading && (
                <button
                    type="button"
                    onClick={start}
                    className="flex w-full items-center gap-4 rounded-card border border-brand bg-brand-tint p-5 text-left transition duration-120 active:scale-[.98]"
                >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-paper">
                        <Sparkles className="size-5" strokeWidth={1.6} />
                    </span>
                    <span className="flex-1">
                        <span className="block font-serif text-[22px] leading-tight">
                            Help me choose
                        </span>
                        <span className="block text-[14px] text-ink-muted">
                            Three quick questions, then your best picks and why
                        </span>
                    </span>
                </button>
            )}

            {loading && (
                <div className="rounded-card border border-line bg-paper p-6 text-center">
                    <Sparkles
                        className="mx-auto size-6 animate-pulse text-brand"
                        strokeWidth={1.6}
                    />
                    <p className="mt-2 font-serif text-[20px]">
                        Thinking about tonight…
                    </p>
                    <p className="text-[14px] text-ink-muted">
                        {aiEnabled
                            ? 'Reading your notes and ratings'
                            : 'Matching your places'}
                    </p>
                </div>
            )}

            {error && (
                <p className="mt-3 rounded-card bg-warm-tint p-4 text-[15px] text-quote">
                    {error}
                </p>
            )}

            {result && !loading && (
                <div>
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                        <h2 className="font-serif text-[24px]">
                            Picked for you
                        </h2>
                        <button
                            type="button"
                            onClick={start}
                            className="h-11 shrink-0 text-[15px] font-medium text-brand underline underline-offset-4"
                        >
                            Change answers
                        </button>
                    </div>
                    <p className="mb-4 font-serif text-[18px] text-quote italic">
                        {result.intro}
                    </p>

                    {result.picks.length === 0 ? (
                        <p className="rounded-card border border-dashed border-line-strong p-5 text-[15px] text-ink-muted">
                            Nothing matched all your answers. Try "Anything" for
                            the cuisine.
                        </p>
                    ) : (
                        <ol className="flex flex-col gap-3">
                            {result.picks.map((p, i) => (
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
                                                {p.status === 'wish' &&
                                                    ' · Wishlist'}
                                            </span>
                                        </Link>
                                    </div>
                                    <p className="mt-3 text-[15px] font-semibold text-brand">
                                        {p.headline}
                                    </p>
                                    {p.why && (
                                        <p className="mt-0.5 text-[15px] leading-snug">
                                            {p.why}
                                        </p>
                                    )}
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        <a
                                            href={bookingUrl(p).url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex h-12 items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-paper transition duration-120 active:scale-96"
                                        >
                                            Book a table
                                        </a>
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
                    <p className="mt-3 text-[13px] text-ink-muted">
                        {result.source === 'ai'
                            ? 'Chosen by Claude from your own notes and ratings. Book opens the restaurant’s own page; nothing is booked yet.'
                            : 'Matched from your own notes, ratings and tags. Book opens the restaurant’s own page; nothing is booked yet.'}
                    </p>
                </div>
            )}

            <BottomSheet
                open={open}
                onOpenChange={setOpen}
                title={
                    [
                        'What do you feel like?',
                        'Who’s coming?',
                        'What kind of evening?',
                    ][step]
                }
                description={`Question ${step + 1} of 3`}
            >
                {step > 0 && (
                    <button
                        type="button"
                        onClick={() => setStep(step - 1)}
                        className="mb-1 -ml-2 flex h-11 items-center gap-1 px-2 text-[15px] text-ink-muted"
                    >
                        <ArrowLeft className="size-4" strokeWidth={1.8} /> Back
                    </button>
                )}

                {step === 0 && (
                    <div className="flex flex-wrap gap-2 pb-2">
                        {[null, ...cuisines].map((c) => (
                            <button
                                key={c ?? 'any'}
                                type="button"
                                aria-pressed={cuisine === c}
                                onClick={() => {
                                    setCuisine(c);
                                    next();
                                }}
                                className={cn(
                                    'h-12 rounded-full border px-5 text-[16px] font-medium transition active:scale-96',
                                    cuisine === c
                                        ? 'border-ink bg-ink text-paper'
                                        : 'border-line-strong bg-paper',
                                )}
                            >
                                {c ?? 'Anything'}
                            </button>
                        ))}
                    </div>
                )}

                {step === 1 && (
                    <>
                        {COMPANY.map((o) => (
                            <ChoiceRow
                                key={o.value}
                                label={o.label}
                                hint={o.hint}
                                on={company === o.value}
                                onChoose={() => {
                                    setCompany(o.value);
                                    next();
                                }}
                            />
                        ))}
                        <button
                            type="button"
                            onClick={() => {
                                setCompany(null);
                                next();
                            }}
                            className="mt-2 h-11 text-[15px] text-ink-muted underline underline-offset-4"
                        >
                            Skip
                        </button>
                    </>
                )}

                {step === 2 && (
                    <>
                        {MOOD.map((o) => (
                            <ChoiceRow
                                key={o.value}
                                label={o.label}
                                hint={o.hint}
                                on={mood === o.value}
                                onChoose={() =>
                                    setMood(mood === o.value ? null : o.value)
                                }
                            />
                        ))}
                        <label
                            htmlFor="tonight-wish"
                            className="mt-5 mb-1.5 block text-sm font-medium"
                        >
                            Anything else?{' '}
                            <span className="font-normal text-ink-muted">
                                (optional)
                            </span>
                        </label>
                        <textarea
                            id="tonight-wish"
                            rows={2}
                            maxLength={300}
                            value={wish}
                            onChange={(e) => setWish(e.target.value)}
                            placeholder="Not too loud, a good steak, near the city…"
                            className="w-full rounded-input border border-line-strong bg-paper px-4 py-3 text-base placeholder:text-stone focus:border-ink focus:outline-none"
                        />
                        <button
                            type="button"
                            onClick={() => void ask()}
                            className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-brand text-[15px] font-semibold text-paper transition duration-120 active:scale-96"
                        >
                            <Sparkles className="size-5" strokeWidth={1.6} />
                            Show my picks
                        </button>
                    </>
                )}
            </BottomSheet>
        </section>
    );
}
