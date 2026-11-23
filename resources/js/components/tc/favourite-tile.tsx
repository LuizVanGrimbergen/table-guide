import { Link } from '@inertiajs/react';
import { Heart } from 'lucide-react';
import type { Place } from '@/lib/collection';
import { toneFor } from '@/lib/collection';
import { cuisineIcon } from '@/lib/place-icons';

/** Small tile for the Favourites row on Home: cuisine icon, name, area. */
export function FavouriteTile({ place }: { place: Place }) {
    const Icon = cuisineIcon(place.cuisine);
    const meta = [place.cuisine, place.area].filter(Boolean).join(' · ');

    return (
        <Link
            href={`/restaurants/${place.restaurantId}`}
            className="flex w-[148px] shrink-0 flex-col gap-2.5 transition duration-120 active:scale-[.97] active:opacity-90"
        >
            <span
                aria-hidden
                className="relative flex h-[104px] items-center justify-center rounded-card"
                style={{ background: toneFor(place.name) }}
            >
                <Icon className="size-9 text-white/90" strokeWidth={1.25} />
                <Heart
                    className="absolute top-2.5 right-2.5 size-3.5 text-white/80"
                    fill="currentColor"
                    strokeWidth={1.5}
                />
            </span>
            <span className="px-0.5">
                <span className="line-clamp-2 font-serif text-[17px] leading-tight">
                    {place.name}
                </span>
                {meta && (
                    <span className="mt-0.5 block truncate text-[13px] text-ink-muted">
                        {meta}
                    </span>
                )}
            </span>
        </Link>
    );
}
