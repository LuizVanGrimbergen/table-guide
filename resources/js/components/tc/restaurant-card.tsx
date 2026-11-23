import { Link } from '@inertiajs/react';
import { Heart } from 'lucide-react';
import type { Place } from '@/lib/collection';
import { placeLine, statusOf, toneFor } from '@/lib/collection';
import { cn } from '@/lib/utils';

export function StatusBadge({
    place,
    className,
}: {
    place: Pick<Place, 'notRecommended' | 'favourite' | 'status'>;
    className?: string;
}) {
    const status = statusOf(place);

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 text-[13px] font-medium',
                className,
            )}
            style={{ color: status.color }}
        >
            <span
                className="size-2 rounded-full"
                style={{
                    background:
                        status.key === 'wish' ? 'transparent' : status.color,
                    border: `1.5px solid ${status.color}`,
                }}
            />
            {status.label}
        </span>
    );
}

export function ColourBlock({
    name,
    className,
}: {
    name: string;
    className?: string;
}) {
    return (
        <div
            aria-hidden
            className={cn(
                'flex items-end justify-end overflow-hidden p-3 font-serif text-[56px] leading-none text-white/35 italic',
                className,
            )}
            style={{ background: toneFor(name) }}
        >
            {name.charAt(0)}
        </div>
    );
}

/** Card: colour block, status, name, his note as the hero, area. */
export function RestaurantCard({
    place,
    compact,
}: {
    place: Place;
    compact?: boolean;
}) {
    return (
        <Link
            href={`/restaurants/${place.restaurantId}`}
            className={cn(
                'group flex flex-col overflow-hidden rounded-card border border-line bg-paper transition duration-120 active:scale-[.98] active:opacity-90',
                compact && 'w-64 shrink-0',
            )}
        >
            <ColourBlock name={place.name} className="h-24" />
            <div className="flex flex-1 flex-col gap-1.5 p-4">
                <div className="flex items-center justify-between">
                    <StatusBadge place={place} />
                    {place.favourite && (
                        <Heart
                            className="size-4 text-burgundy"
                            fill="currentColor"
                            strokeWidth={1.5}
                            aria-hidden
                        />
                    )}
                </div>
                <h3 className="font-serif text-[23px] leading-tight">
                    {place.name}
                </h3>
                {place.note && (
                    <p
                        className={cn(
                            'font-serif text-[18px] leading-snug text-espresso italic',
                            compact && 'line-clamp-2',
                        )}
                    >
                        {place.note}
                    </p>
                )}
                <p className="mt-auto pt-1 text-sm text-ink-muted">
                    {placeLine(place)}
                </p>
            </div>
        </Link>
    );
}

/** Compact list row: status dot, name, area, status label. */
export function RestaurantRow({ place }: { place: Place }) {
    const status = statusOf(place);

    return (
        <Link
            href={`/restaurants/${place.restaurantId}`}
            className="flex min-h-[60px] items-center gap-3 border-b border-line py-2.5 transition last:border-0 active:opacity-80"
        >
            <span
                className="size-2.5 shrink-0 rounded-full"
                style={{
                    background:
                        status.key === 'wish' ? 'transparent' : status.color,
                    border: `1.5px solid ${status.color}`,
                }}
                aria-hidden
            />
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-medium">
                    {place.name}
                </span>
                <span className="block truncate text-sm text-ink-muted">
                    {placeLine(place)}
                </span>
            </span>
            <span
                className="shrink-0 text-[13px] font-medium"
                style={{ color: status.color }}
            >
                {status.label}
            </span>
        </Link>
    );
}
