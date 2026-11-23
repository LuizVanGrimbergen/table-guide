import { Link, router } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { logout } from '@/routes';
import { BottomSheet } from './bottom-sheet';

type Item = { label: string; href?: string; hint?: string };

export const MORE_ITEMS: Item[] = [
    { label: 'Favourites', href: '/collection?status=fav&city=All' },
    { label: 'Wishlist', href: '/collection?status=wish&city=All' },
    { label: 'Tonight', href: '/tonight' },
    { label: 'My Circle', href: '/friends' },
    { label: 'Dinner plans', hint: 'Coming soon' },
    { label: 'Settings', href: '/settings/profile' },
    { label: 'Import / Export', hint: 'Coming soon' },
    { label: 'Help', hint: 'Coming soon' },
];

/** The app's "More" menu. Never confused with a restaurant's View Menu. */
export function MoreSheet({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <BottomSheet open={open} onOpenChange={onOpenChange} title="More">
            <nav aria-label="More" className="flex flex-col">
                {MORE_ITEMS.map((item) =>
                    item.href ? (
                        <Link
                            key={item.label}
                            href={item.href}
                            onClick={() => onOpenChange(false)}
                            className="flex min-h-[58px] items-center justify-between border-b border-line text-[17px] transition active:opacity-70"
                        >
                            {item.label}
                            <ChevronRight
                                className="size-5 text-stone"
                                strokeWidth={1.5}
                            />
                        </Link>
                    ) : (
                        <div
                            key={item.label}
                            className="flex min-h-[58px] items-center justify-between border-b border-line text-[17px] text-ink-muted"
                        >
                            {item.label}
                            <span className="text-[13px]">{item.hint}</span>
                        </div>
                    ),
                )}
                <button
                    type="button"
                    onClick={() => {
                        onOpenChange(false);
                        // Wipe the offline copy of his collection from this device.
                        navigator.serviceWorker?.controller?.postMessage(
                            'clear-private',
                        );
                        router.flushAll();
                        router.post(logout().url);
                    }}
                    className="flex min-h-[58px] items-center text-left text-[17px] text-burgundy transition active:opacity-70"
                >
                    Log out
                </button>
            </nav>
        </BottomSheet>
    );
}
