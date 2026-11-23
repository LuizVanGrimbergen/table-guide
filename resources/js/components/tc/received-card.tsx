import { Link, router } from '@inertiajs/react';
import { Check } from 'lucide-react';
import { placeLine } from '@/lib/collection';
import { cn } from '@/lib/utils';

export type Received = {
    id: number;
    restaurantId: number;
    name: string;
    area: string | null;
    city: string;
    cuisine: string | null;
    from: string;
    message: string | null;
    sentAt: string | null;
    saved: boolean;
};

/** A friend's recommendation with one-tap "Save to wishlist". */
export function ReceivedCard({ rec }: { rec: Received }) {
    return (
        <div className="rounded-card border border-line bg-paper p-4">
            <p className="text-[13px] font-semibold text-olive">
                {rec.from} recommends
            </p>
            <Link
                href={`/restaurants/${rec.restaurantId}`}
                className="mt-1 block"
            >
                <span className="block font-serif text-[22px] leading-tight">
                    {rec.name}
                </span>
                <span className="block text-sm text-ink-muted">
                    {[placeLine(rec), rec.cuisine].filter(Boolean).join(' · ')}
                </span>
            </Link>
            {rec.message && (
                <p className="mt-2 font-serif text-[18px] leading-snug text-espresso italic">
                    “{rec.message}”
                </p>
            )}
            <button
                type="button"
                disabled={rec.saved}
                onClick={() =>
                    router.post(
                        `/recommendations/${rec.id}/save`,
                        {},
                        { preserveScroll: true },
                    )
                }
                className={cn(
                    'mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition duration-120 active:scale-96',
                    rec.saved
                        ? 'bg-olive-tint text-olive'
                        : 'bg-ink text-paper',
                )}
            >
                {rec.saved && <Check className="size-4" strokeWidth={2} />}
                {rec.saved ? 'Saved to wishlist' : 'Save to wishlist'}
            </button>
        </div>
    );
}
