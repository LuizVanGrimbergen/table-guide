import { Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import type {
    Availability,
    CheckerPlace,
    Choice,
    Slot,
} from '@/lib/availability';
import { availabilityUrl, unknownReason } from '@/lib/availability';
import { toneFor } from '@/lib/collection';
import { cuisineIcon } from '@/lib/place-icons';
import { cn } from '@/lib/utils';

type State =
    | { kind: 'loading' }
    | { kind: 'done'; data: Availability }
    | { kind: 'failed'; message: string };

/** Waits this long after the last change before asking, so tapping through times doesn't fire a lookup per tap. */
const SETTLE_MS = 350;

const TONE = {
    available: { dot: 'bg-been', text: 'text-been', edge: 'border-l-been' },
    alternative: {
        dot: 'bg-wishlist',
        text: 'text-wishlist',
        edge: 'border-l-wishlist',
    },
    full: { dot: 'bg-warm', text: 'text-warm', edge: 'border-l-warm' },
    unknown: {
        dot: 'bg-stone',
        text: 'text-ink-muted',
        edge: 'border-l-stone',
    },
};

/**
 * One restaurant in the checker. Loads its own answer, so a slow booking
 * system only delays its own card.
 */
export function TableCard({
    place,
    choice,
    online,
}: {
    place: CheckerPlace;
    choice: Choice;
    online: boolean;
}) {
    const [state, setState] = useState<State>({ kind: 'loading' });

    useEffect(() => {
        if (!online) {
            return;
        }

        const controller = new AbortController();
        setState({ kind: 'loading' });

        const timer = window.setTimeout(async () => {
            try {
                const response = await fetch(
                    availabilityUrl(place.restaurantId, choice),
                    {
                        headers: {
                            Accept: 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        credentials: 'same-origin',
                        signal: controller.signal,
                    },
                );

                if (response.status === 429) {
                    setState({
                        kind: 'failed',
                        message:
                            'Too many checks. Wait a minute and try again.',
                    });

                    return;
                }

                if (!response.ok) {
                    setState({
                        kind: 'failed',
                        message: "Couldn't check right now.",
                    });

                    return;
                }

                setState({
                    kind: 'done',
                    data: (await response.json()) as Availability,
                });
            } catch {
                if (!controller.signal.aborted) {
                    setState({
                        kind: 'failed',
                        message: "Couldn't reach the app's server.",
                    });
                }
            }
        }, SETTLE_MS);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [place.restaurantId, choice, online]);

    const status = state.kind === 'done' ? state.data.status : 'unknown';
    const tone = TONE[status];
    const Icon = cuisineIcon(place.cuisine);
    const mainLink =
        state.kind === 'done'
            ? (state.data.requested?.bookingUrl ?? state.data.bookingUrl)
            : null;
    const meta = [place.area, place.providerLabel].filter(Boolean).join(' · ');

    const header = (
        <span className="flex items-center gap-3.5">
            <span
                aria-hidden
                className="flex size-[52px] shrink-0 items-center justify-center rounded-[14px]"
                style={{ background: toneFor(place.name) }}
            >
                <Icon className="size-6 text-white/90" strokeWidth={1.3} />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate font-serif text-[20px] leading-tight">
                    {place.name}
                </span>
                {meta && (
                    <span className="mt-0.5 block truncate text-[13px] text-ink-muted">
                        {meta}
                    </span>
                )}
            </span>
        </span>
    );

    return (
        <li
            className={cn(
                'rounded-card border border-l-4 border-line bg-paper p-4',
                state.kind === 'loading' ? 'border-l-line' : tone.edge,
            )}
            aria-busy={state.kind === 'loading'}
        >
            {mainLink ? (
                <a
                    href={mainLink}
                    target="_blank"
                    rel="noreferrer"
                    className="block transition active:opacity-70"
                >
                    {header}
                </a>
            ) : (
                header
            )}

            <div className="mt-3" aria-live="polite">
                {!online ? (
                    <p className="text-[15px] text-ink-muted">
                        Waiting for internet…
                    </p>
                ) : state.kind === 'loading' ? (
                    <p className="flex items-center gap-2 text-[15px] text-ink-muted">
                        <span
                            className="size-2.5 animate-pulse rounded-full bg-line-strong"
                            aria-hidden
                        />
                        Checking {place.providerLabel}…
                    </p>
                ) : state.kind === 'failed' ? (
                    <p className="text-[15px] text-ink-muted">
                        {state.message}
                    </p>
                ) : (
                    <Answer
                        data={state.data}
                        choice={choice}
                        toneText={tone.text}
                        toneDot={tone.dot}
                    />
                )}
            </div>
        </li>
    );
}

function Answer({
    data,
    choice,
    toneText,
    toneDot,
}: {
    data: Availability;
    choice: Choice;
    toneText: string;
    toneDot: string;
}) {
    const headline = {
        available: `${choice.time} is free`,
        alternative: `${choice.time} is taken. Other times:`,
        full: `Nothing free around ${choice.time}`,
        unknown: unknownReason(data.error, data.providerLabel),
    }[data.status];

    return (
        <>
            <p
                className={cn(
                    'flex items-center gap-2 text-[15px] font-semibold',
                    toneText,
                )}
            >
                <span
                    className={cn('size-2.5 shrink-0 rounded-full', toneDot)}
                    aria-hidden
                />
                {headline}
            </p>

            {(data.requested || data.nearest.length > 0) && (
                <ul
                    className="mt-3 flex flex-wrap gap-2"
                    aria-label="Free times"
                >
                    {/* In time order; the requested time stands out. */}
                    {[
                        ...(data.requested ? [data.requested] : []),
                        ...data.nearest,
                    ]
                        .sort((x, y) => x.time.localeCompare(y.time))
                        .map((slot) => (
                            <TimeChip
                                key={slot.time}
                                slot={slot}
                                primary={slot.time === data.requested?.time}
                            />
                        ))}
                </ul>
            )}

            {data.status === 'unknown' && (data.phone || data.bookingUrl) && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {data.phone && (
                        <a
                            href={`tel:${data.phone}`}
                            className="flex h-11 items-center gap-2 rounded-full border border-ink px-4 text-[15px] font-semibold transition active:scale-96"
                        >
                            <Phone className="size-4" strokeWidth={1.6} />
                            Call
                        </a>
                    )}
                    {data.bookingUrl && (
                        <a
                            href={data.bookingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-11 items-center rounded-full border border-line-strong px-4 text-[15px] font-medium transition active:scale-96"
                        >
                            Open booking page
                        </a>
                    )}
                </div>
            )}

            {data.status === 'full' && data.bookingUrl && (
                <a
                    href={data.bookingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex min-h-11 items-center text-[15px] font-medium underline underline-offset-4"
                >
                    See other days on their page
                </a>
            )}
        </>
    );
}

function TimeChip({ slot, primary }: { slot: Slot; primary?: boolean }) {
    const className = cn(
        'flex h-11 min-w-[72px] items-center justify-center rounded-full px-4 text-[16px] font-semibold tabular-nums transition duration-120 active:scale-96',
        primary
            ? 'bg-been text-paper'
            : 'border border-line-strong bg-paper text-ink',
    );

    return (
        <li>
            {slot.bookingUrl ? (
                <a
                    href={slot.bookingUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Book ${slot.time}`}
                    className={className}
                >
                    {slot.time}
                </a>
            ) : (
                <span className={className}>{slot.time}</span>
            )}
        </li>
    );
}
