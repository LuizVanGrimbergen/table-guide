import { Link } from '@inertiajs/react';
import { Heart, Navigation } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Place } from '@/lib/collection';
import {
    directionsUrl,
    formatDistance,
    statusOf,
    toneFor,
} from '@/lib/collection';
import { cuisineIcon } from '@/lib/place-icons';
import { cn } from '@/lib/utils';

type Props = {
    places: Place[];
    selectedId: number | null;
    /** Called when a swipe settles on a card. */
    onSwipeTo: (place: Place) => void;
    kmAway: (place: Place) => number | null;
};

/**
 * Row of place cards along the bottom of the map. Swiping settles on a card
 * and selects its pin; tapping a pin scrolls its card into view. Tapping the
 * selected card opens the place.
 */
export function PlaceCarousel({
    places,
    selectedId,
    onSwipeTo,
    kmAway,
}: Props) {
    const scroller = useRef<HTMLDivElement>(null);
    const cards = useRef(new Map<number, HTMLElement>());
    const settle = useRef<number | undefined>(undefined);
    const programmatic = useRef(false);

    // A pin was tapped: bring its card to the middle.
    useEffect(() => {
        const el = selectedId !== null ? cards.current.get(selectedId) : null;

        if (!el || !scroller.current) {
            return;
        }

        const box = scroller.current;
        const target = el.offsetLeft - (box.clientWidth - el.clientWidth) / 2;

        if (Math.abs(box.scrollLeft - target) > 4) {
            programmatic.current = true;
            box.scrollTo({ left: target, behavior: 'smooth' });
        }
    }, [selectedId]);

    const onScroll = () => {
        window.clearTimeout(settle.current);
        settle.current = window.setTimeout(() => {
            if (programmatic.current) {
                programmatic.current = false;

                return;
            }

            const box = scroller.current;

            if (!box) {
                return;
            }

            const middle = box.scrollLeft + box.clientWidth / 2;
            let best: Place | null = null;
            let bestGap = Infinity;

            for (const p of places) {
                const el = cards.current.get(p.id);

                if (!el) {
                    continue;
                }

                const gap = Math.abs(
                    el.offsetLeft + el.clientWidth / 2 - middle,
                );

                if (gap < bestGap) {
                    bestGap = gap;
                    best = p;
                }
            }

            if (best && best.id !== selectedId) {
                onSwipeTo(best);
            }
        }, 140);
    };

    useEffect(() => () => window.clearTimeout(settle.current), []);

    return (
        <div
            ref={scroller}
            onScroll={onScroll}
            className="flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto px-[max(16px,calc(50%-170px))] pb-4"
        >
            {places.map((p) => (
                <PlaceCard
                    key={p.id}
                    place={p}
                    on={p.id === selectedId}
                    km={kmAway(p)}
                    refCallback={(el) => {
                        if (el) {
                            cards.current.set(p.id, el);
                        } else {
                            cards.current.delete(p.id);
                        }
                    }}
                />
            ))}
        </div>
    );
}

function PlaceCard({
    place,
    on,
    km,
    refCallback,
}: {
    place: Place;
    on: boolean;
    km: number | null;
    refCallback: (el: HTMLElement | null) => void;
}) {
    const Icon = cuisineIcon(place.cuisine);
    const status = statusOf(place);
    const meta = [place.cuisine, place.area].filter(Boolean).join(' · ');

    return (
        <article
            ref={refCallback}
            className={cn(
                'relative flex w-[min(340px,calc(100vw-64px))] shrink-0 snap-center gap-3 rounded-card border bg-paper p-3 shadow-[0_6px_20px_rgba(30,27,24,0.16)] transition-[border-color,transform] duration-150',
                on ? 'border-brand' : 'border-transparent',
            )}
        >
            <Link
                href={`/restaurants/${place.restaurantId}`}
                className="flex min-w-0 flex-1 gap-3"
            >
                <span
                    aria-hidden
                    className="relative flex size-[76px] shrink-0 items-center justify-center rounded-[14px]"
                    style={{ background: toneFor(place.name) }}
                >
                    <Icon className="size-8 text-white/90" strokeWidth={1.25} />
                    {place.favourite && (
                        <Heart
                            className="absolute top-1.5 right-1.5 size-3.5 text-white/85"
                            fill="currentColor"
                            strokeWidth={1.5}
                        />
                    )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col justify-center pr-9">
                    <span
                        className="flex items-center gap-1.5 text-[12px] font-medium"
                        style={{ color: status.color }}
                    >
                        <span
                            className="size-2 rounded-full"
                            style={{
                                background:
                                    status.key === 'wish'
                                        ? 'transparent'
                                        : status.color,
                                border: `1.5px solid ${status.color}`,
                            }}
                        />
                        {status.label}
                        {km !== null && (
                            <span className="text-ink-muted">
                                · {formatDistance(km)}
                            </span>
                        )}
                    </span>
                    <span className="truncate font-serif text-[19px] leading-tight">
                        {place.name}
                    </span>
                    {place.note ? (
                        <span className="truncate font-serif text-[15px] text-quote italic">
                            {place.note}
                        </span>
                    ) : (
                        meta && (
                            <span className="truncate text-[13px] text-ink-muted">
                                {meta}
                            </span>
                        )
                    )}
                    {place.note && meta && (
                        <span className="truncate text-[13px] text-ink-muted">
                            {meta}
                        </span>
                    )}
                </span>
            </Link>
            <a
                href={directionsUrl(place)}
                target="_blank"
                rel="noreferrer"
                aria-label={`Directions to ${place.name}`}
                className="absolute top-1/2 right-2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-ink transition active:scale-96 active:bg-sand"
            >
                <Navigation className="size-5" strokeWidth={1.6} />
            </a>
        </article>
    );
}
