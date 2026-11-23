import type { Place } from '@/lib/collection';
import { statusOf } from '@/lib/collection';
import { cuisineIcon } from '@/lib/place-icons';

/** Pin colours per status: fill, outline and icon colour. */
const STYLES = {
    been: { fill: '#3F6B4E', stroke: '#FFFDF9', icon: '#FFFDF9' },
    favourite: { fill: '#8B2E3B', stroke: '#FFFDF9', icon: '#FFFDF9' },
    wish: { fill: '#FFFDF9', stroke: '#8A6116', icon: '#8A6116' },
    not_recommended: { fill: '#A79C90', stroke: '#FFFDF9', icon: '#FFFDF9' },
} as const;

/**
 * Teardrop map pin in the status colour with the cuisine's line icon inside.
 * The tip of the pin sits on the location (AdvancedMarker anchors bottom
 * centre). The selected pin is larger and shows the name underneath; the
 * label is absolutely positioned so it never moves that anchor.
 */
export function MapPin({ place, on }: { place: Place; on: boolean }) {
    const status = statusOf(place).key;
    const s = STYLES[status];
    const Icon = cuisineIcon(place.cuisine);
    const dim = status === 'not_recommended' && !on;
    const w = on ? 44 : dim ? 26 : 32;
    const h = Math.round(w * 1.25);

    return (
        <span className="relative flex flex-col items-center">
            <span
                className="relative transition-all duration-150"
                style={{
                    width: w,
                    height: h,
                    filter: 'drop-shadow(0 2px 3px rgba(30,27,24,0.35))',
                }}
            >
                <svg
                    viewBox="0 0 32 40"
                    width={w}
                    height={h}
                    className="absolute inset-0"
                    aria-hidden
                >
                    <path
                        d="M16 39C16 39 30 24.6 30 15A14 14 0 0 0 2 15C2 24.6 16 39 16 39Z"
                        fill={s.fill}
                        stroke={s.stroke}
                        strokeWidth={status === 'wish' ? 2.25 : 2}
                    />
                </svg>
                <Icon
                    aria-hidden
                    className="absolute left-1/2 -translate-x-1/2"
                    style={{
                        top: w * 0.2,
                        width: w * 0.46,
                        height: w * 0.46,
                        color: s.icon,
                    }}
                    strokeWidth={1.75}
                />
                {place.favourite && on && (
                    <span className="absolute -top-1 -right-1 size-3 rounded-full border-2 border-paper bg-warm" />
                )}
            </span>
            {on && (
                <span className="absolute top-full left-1/2 mt-1 max-w-40 -translate-x-1/2 truncate rounded-full bg-brand px-2.5 py-0.5 text-[13px] font-semibold text-paper shadow-[0_2px_6px_rgba(30,27,24,0.3)]">
                    {place.name}
                </span>
            )}
        </span>
    );
}
