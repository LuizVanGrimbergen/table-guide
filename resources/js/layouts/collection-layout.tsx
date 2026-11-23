import { Link, usePage } from '@inertiajs/react';
import {
    Home,
    LibraryBig,
    Map as MapIcon,
    Menu,
    Moon,
    Plus,
    Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AddSheet } from '@/components/tc/add-sheet';
import { MORE_ITEMS, MoreSheet } from '@/components/tc/more-sheet';
import { cn } from '@/lib/utils';

const NAV = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'My Places', href: '/collection', icon: LibraryBig },
    { label: 'Map', href: '/map', icon: MapIcon },
    { label: 'Friends', href: '/friends', icon: Users },
];

function isActive(url: string, href: string): boolean {
    const path = url.split('?')[0];

    return href === '/' ? path === '/' : path.startsWith(href);
}

function useFlashToast() {
    const { toast: message } = usePage<{ toast?: string | null }>().props;

    useEffect(() => {
        if (message) {
            toast(message);
        }
    }, [message]);
}

export default function CollectionLayout({
    children,
}: {
    children: ReactNode;
}) {
    const { url } = usePage();
    const [moreOpen, setMoreOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const isMap = url.startsWith('/map');

    useFlashToast();

    return (
        <div className="min-h-dvh bg-ivory text-ink md:flex">
            {/* Desktop sidebar */}
            <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-paper px-5 py-8 md:flex">
                <Link
                    href="/"
                    className="mb-8 px-3 font-serif text-[26px] leading-none"
                >
                    The Collection
                </Link>
                <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    className="mb-6 flex h-12 items-center justify-center gap-2 rounded-full bg-ink text-[15px] font-semibold text-paper transition duration-120 active:scale-96 active:opacity-80"
                >
                    <Plus className="size-5" strokeWidth={1.8} /> Add restaurant
                </button>
                <nav aria-label="Main" className="flex flex-col gap-1">
                    {[
                        ...NAV.slice(0, 3),
                        { label: 'Tonight', href: '/tonight', icon: Moon },
                        NAV[3],
                    ].map(({ label, href, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                'flex h-11 items-center gap-3 rounded-full px-4 text-[15px] font-medium transition',
                                isActive(url, href)
                                    ? 'bg-ink text-paper'
                                    : 'text-ink hover:bg-sand',
                            )}
                        >
                            <Icon className="size-5" strokeWidth={1.6} />
                            {label}
                        </Link>
                    ))}
                </nav>
                <div className="mt-8 border-t border-line pt-4">
                    <p className="mb-1 px-4 text-[13px] font-medium text-ink-muted">
                        More
                    </p>
                    {MORE_ITEMS.filter(
                        (i) =>
                            i.href &&
                            !['/tonight', '/friends'].includes(i.href),
                    ).map((item) => (
                        <Link
                            key={item.label}
                            href={item.href!}
                            className="flex h-10 items-center rounded-full px-4 text-[15px] text-ink-muted transition hover:bg-sand hover:text-ink"
                        >
                            {item.label}
                        </Link>
                    ))}
                    <button
                        type="button"
                        onClick={() => setMoreOpen(true)}
                        className="flex h-10 w-full items-center rounded-full px-4 text-left text-[15px] text-ink-muted transition hover:bg-sand hover:text-ink"
                    >
                        Everything else
                    </button>
                </div>
            </aside>

            <div className="min-w-0 flex-1">
                {/* Mobile top bar */}
                {!isMap && (
                    <header className="flex items-center justify-between px-5 pt-[max(12px,env(safe-area-inset-top))] pb-1 md:hidden">
                        <Link href="/" className="font-serif text-[20px]">
                            The Collection
                        </Link>
                        <button
                            type="button"
                            onClick={() => setMoreOpen(true)}
                            className="-mr-2 flex h-11 items-center gap-1.5 rounded-full px-3 text-[15px] font-medium transition active:scale-96 active:opacity-80"
                        >
                            <Menu className="size-5" strokeWidth={1.6} />
                            More
                        </button>
                    </header>
                )}

                <main
                    className={cn(
                        !isMap &&
                            'mx-auto max-w-5xl pb-[calc(96px+env(safe-area-inset-bottom))] md:px-9 md:pt-10 md:pb-16',
                    )}
                >
                    {children}
                </main>
            </div>

            {/* Mobile bottom nav */}
            <nav
                aria-label="Main"
                className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
            >
                <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
                    {NAV.slice(0, 2).map((item) => (
                        <NavItem
                            key={item.href}
                            {...item}
                            active={isActive(url, item.href)}
                        />
                    ))}
                    <div className="flex justify-center">
                        <button
                            type="button"
                            onClick={() => setAddOpen(true)}
                            aria-label="Add restaurant"
                            className="-mt-7 flex size-14 items-center justify-center rounded-full bg-ink text-paper shadow-[0_6px_18px_rgba(30,27,24,0.28)] transition duration-120 active:scale-96 active:opacity-80"
                        >
                            <Plus className="size-7" strokeWidth={1.6} />
                        </button>
                    </div>
                    {NAV.slice(2).map((item) => (
                        <NavItem
                            key={item.href}
                            {...item}
                            active={isActive(url, item.href)}
                        />
                    ))}
                </div>
            </nav>

            <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
            <AddSheet open={addOpen} onOpenChange={setAddOpen} />
        </div>
    );
}

function NavItem({
    label,
    href,
    icon: Icon,
    active,
}: (typeof NAV)[number] & { active: boolean }) {
    return (
        <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'flex h-14 flex-col items-center justify-center gap-0.5 text-[12px] transition active:opacity-70',
                active
                    ? 'font-semibold text-ink'
                    : 'font-medium text-ink-muted',
            )}
        >
            <Icon className="size-[22px]" strokeWidth={active ? 1.9 : 1.5} />
            {label}
        </Link>
    );
}
