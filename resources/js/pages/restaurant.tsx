import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import type { FormDataConvertible } from '@inertiajs/core';
import {
    ArrowLeft,
    BookOpen,
    Check,
    CalendarDays,
    Heart,
    Navigation,
    Send,
    UtensilsCrossed,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import { BottomSheet } from '@/components/tc/bottom-sheet';
import { ColourBlock } from '@/components/tc/restaurant-card';
import { Stars } from '@/components/tc/stars';
import { downloadIcs, googleCalendarUrl } from '@/lib/calendar';
import type { OccasionKey, Place } from '@/lib/collection';
import {
    bookingUrl,
    directionsUrl,
    GOOD_FOR,
    mapsSearchUrl,
    OCCASIONS,
    placeLine,
    statusOf,
} from '@/lib/collection';
import { cn } from '@/lib/utils';

type MenuLink = {
    id: number;
    kind: 'food' | 'drinks' | 'wine';
    url: string;
    source: 'verified' | 'user';
    maybeStale: boolean;
    checkedAt: string | null;
    canDelete: boolean;
};

type Restaurant = {
    id: number;
    name: string;
    city: string;
    area: string | null;
    country: string | null;
    address: string | null;
    cuisine: string | null;
    occasion: OccasionKey | null;
    website: string | null;
    phone: string | null;
    lat: number | null;
    lng: number | null;
    verifyStatus: string | null;
    verifiedAt: string | null;
    timezone: string;
    menuLinks: MenuLink[];
};

type Props = {
    restaurant: Restaurant;
    entry: Place | null;
    friends: Friend[];
};

type SheetKind = 'menu' | 'book' | 'recommend' | 'plan' | null;

const MENU_KINDS = {
    food: 'Food menu',
    drinks: 'Drinks menu',
    wine: 'Wine list',
};

const VERIFY_LABELS: Record<string, string> = {
    verified: 'Verified',
    needs_review: 'Needs review',
    possibly_closed: 'Possibly closed',
    closed: 'Permanently closed',
};

const field =
    'h-12 w-full rounded-input border border-line-strong bg-paper px-4 text-base text-ink placeholder:text-stone focus:border-ink focus:outline-none';

export default function RestaurantPage({ restaurant, entry, friends }: Props) {
    const [sheet, setSheet] = useState<SheetKind>(null);
    const close = (open: boolean) => !open && setSheet(null);
    const status = entry ? statusOf(entry) : null;
    const tags = [
        restaurant.cuisine,
        ...(entry?.goodFor ?? []).map(
            (g) => GOOD_FOR[g as keyof typeof GOOD_FOR] ?? g,
        ),
    ].filter(Boolean) as string[];

    const patch = (data: Record<string, FormDataConvertible>) => {
        if (entry) {
            router.patch(`/entries/${entry.id}`, data, {
                preserveScroll: true,
                preserveState: true,
            });
        }
    };

    return (
        <>
            <Head title={restaurant.name} />
            <article className="pb-6">
                {/* Hero */}
                <div className="relative md:overflow-hidden md:rounded-card">
                    <ColourBlock
                        name={restaurant.name}
                        className="h-56 text-[120px] md:h-64"
                    />
                    <button
                        type="button"
                        onClick={() =>
                            window.history.length > 1
                                ? window.history.back()
                                : router.visit('/collection')
                        }
                        aria-label="Back"
                        className="absolute top-4 left-4 flex size-11 items-center justify-center rounded-full bg-paper/90 text-ink shadow-sm transition active:scale-96"
                    >
                        <ArrowLeft className="size-5" strokeWidth={1.6} />
                    </button>
                    {entry && (
                        <button
                            type="button"
                            onClick={() =>
                                patch({ favourite: !entry.favourite })
                            }
                            aria-label={
                                entry.favourite
                                    ? 'Remove from favourites'
                                    : 'Add to favourites'
                            }
                            aria-pressed={entry.favourite}
                            className="absolute top-4 right-4 flex size-11 items-center justify-center rounded-full bg-paper/90 text-warm shadow-sm transition active:scale-90"
                        >
                            <Heart
                                className={cn(
                                    'size-5 transition-transform',
                                    entry.favourite &&
                                        'animate-[heart-pop_240ms_ease-out]',
                                )}
                                fill={entry.favourite ? 'currentColor' : 'none'}
                                strokeWidth={1.6}
                            />
                        </button>
                    )}
                </div>

                <div className="px-5 pt-5 md:px-0">
                    <p
                        className="text-[13px] font-semibold tracking-wide uppercase"
                        style={{ color: status?.color ?? '#6B6158' }}
                    >
                        {[
                            status?.label,
                            restaurant.occasion
                                ? OCCASIONS[restaurant.occasion].label
                                : null,
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    </p>
                    <h1 className="mt-1 font-serif text-[34px] leading-tight md:text-[36px]">
                        {restaurant.name}
                    </h1>
                    <p className="mt-1 text-[15px] text-ink-muted">
                        {placeLine(restaurant)}
                    </p>
                    {tags.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-2">
                            {tags.map((t) => (
                                <li
                                    key={t}
                                    className="rounded-full bg-sand px-3 py-1 text-[13px] font-medium"
                                >
                                    {t}
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Four actions */}
                    <div className="mt-6 grid grid-cols-4 gap-2">
                        <ActionButton
                            primary
                            icon={<BookOpen />}
                            label="View Menu"
                            onClick={() => setSheet('menu')}
                        />
                        <ActionButton
                            icon={<UtensilsCrossed />}
                            label="Book"
                            onClick={() => setSheet('book')}
                        />
                        <ActionButton
                            icon={<Navigation />}
                            label="Directions"
                            href={directionsUrl(restaurant)}
                        />
                        <ActionButton
                            icon={<Send />}
                            label="Recommend"
                            onClick={() => setSheet('recommend')}
                        />
                    </div>

                    {entry ? (
                        <PersonalCard entry={entry} onPatch={patch} />
                    ) : (
                        <div className="mt-6 rounded-card border border-line bg-paper p-5">
                            <p className="text-[15px] text-ink-muted">
                                Not in your collection yet.
                            </p>
                            <button
                                type="button"
                                onClick={() =>
                                    router.post(
                                        `/restaurants/${restaurant.id}/save`,
                                        {},
                                        { preserveScroll: true },
                                    )
                                }
                                className="mt-3 h-12 w-full rounded-full bg-ink text-[15px] font-semibold text-paper"
                            >
                                Save to wishlist
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => setSheet('plan')}
                        className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-full border border-ink text-[15px] font-semibold transition duration-120 active:scale-96 active:opacity-80"
                    >
                        <CalendarDays className="size-5" strokeWidth={1.6} />
                        Plan a dinner here
                    </button>

                    {/* Details */}
                    <dl className="mt-8 rounded-card border border-line bg-paper px-5">
                        <Detail label="Area">
                            {placeLine(restaurant)}
                            {restaurant.country
                                ? `, ${restaurant.country}`
                                : ''}
                        </Detail>
                        <Detail label="Website">
                            {restaurant.website ? (
                                <a
                                    href={restaurant.website}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="break-all underline underline-offset-4"
                                >
                                    {restaurant.website
                                        .replace(/^https?:\/\/(www\.)?/, '')
                                        .replace(/\/$/, '')}
                                </a>
                            ) : (
                                <span className="text-ink-muted">
                                    Not added yet
                                </span>
                            )}
                        </Detail>
                        <Detail label="Address">
                            {restaurant.address ?? (
                                <a
                                    href={mapsSearchUrl(restaurant)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="underline underline-offset-4"
                                >
                                    Look up on Google Maps
                                </a>
                            )}
                        </Detail>
                        <Detail label="Phone">
                            {restaurant.phone ? (
                                <a
                                    href={`tel:${restaurant.phone}`}
                                    className="underline underline-offset-4"
                                >
                                    {restaurant.phone}
                                </a>
                            ) : (
                                <span className="text-ink-muted">
                                    Not added yet
                                </span>
                            )}
                        </Detail>
                        <Detail label="Hours">
                            <a
                                href={mapsSearchUrl(restaurant)}
                                target="_blank"
                                rel="noreferrer"
                                className="underline underline-offset-4"
                            >
                                See today's hours on Google Maps
                            </a>
                        </Detail>
                        <Detail label="Checked">
                            {restaurant.verifyStatus ? (
                                <span
                                    className={cn(
                                        restaurant.verifyStatus !==
                                            'verified' && 'text-warm',
                                    )}
                                >
                                    {VERIFY_LABELS[restaurant.verifyStatus] ??
                                        restaurant.verifyStatus}
                                </span>
                            ) : (
                                <span className="text-ink-muted">
                                    Not checked yet
                                </span>
                            )}
                        </Detail>
                    </dl>

                    {entry && (
                        <button
                            type="button"
                            onClick={() => {
                                if (
                                    window.confirm(
                                        `Remove ${restaurant.name} from your collection? Your note and rating will be deleted.`,
                                    )
                                ) {
                                    router.delete(`/entries/${entry.id}`);
                                }
                            }}
                            className="mt-6 h-11 w-full text-[15px] text-not-recommended underline underline-offset-4"
                        >
                            Remove from my collection
                        </button>
                    )}
                </div>
            </article>

            <MenuSheet
                open={sheet === 'menu'}
                onOpenChange={close}
                restaurant={restaurant}
            />
            <BookSheet
                open={sheet === 'book'}
                onOpenChange={close}
                restaurant={restaurant}
            />
            <RecommendSheet
                open={sheet === 'recommend'}
                onOpenChange={close}
                restaurant={restaurant}
                entry={entry}
                friends={friends}
            />
            <PlanSheet
                open={sheet === 'plan'}
                onOpenChange={close}
                restaurant={restaurant}
            />
        </>
    );
}

function ActionButton({
    icon,
    label,
    onClick,
    href,
    primary,
}: {
    icon: ReactNode;
    label: string;
    onClick?: () => void;
    href?: string;
    primary?: boolean;
}) {
    const className = cn(
        'flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-card border text-[13px] font-semibold transition duration-120 active:scale-96 active:opacity-80 [&_svg]:size-[22px] [&_svg]:stroke-[1.6]',
        primary
            ? 'border-ink bg-ink text-paper'
            : 'border-line bg-paper text-ink',
    );

    return href ? (
        <a href={href} target="_blank" rel="noreferrer" className={className}>
            {icon}
            {label}
        </a>
    ) : (
        <button type="button" onClick={onClick} className={className}>
            {icon}
            {label}
        </button>
    );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex gap-4 border-b border-line py-3.5 text-[15px] last:border-0">
            <dt className="w-20 shrink-0 text-ink-muted">{label}</dt>
            <dd className="min-w-0 flex-1">{children}</dd>
        </div>
    );
}

function PersonalCard({
    entry,
    onPatch,
}: {
    entry: Place;
    onPatch: (data: Record<string, FormDataConvertible>) => void;
}) {
    const [note, setNote] = useState(entry.note ?? '');

    useEffect(() => setNote(entry.note ?? ''), [entry.note]);

    return (
        <section
            className="mt-6 rounded-card border border-line bg-paper p-5"
            aria-label="Your notes"
        >
            <div
                className="grid grid-cols-2 gap-1 rounded-[14px] bg-sand p-1"
                role="radiogroup"
                aria-label="Status"
            >
                {(
                    [
                        ['been', 'Been there'],
                        ['wish', 'Wishlist'],
                    ] as const
                ).map(([value, label]) => (
                    <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={entry.status === value}
                        onClick={() => onPatch({ status: value })}
                        className={cn(
                            'min-h-[46px] rounded-[10px] text-[15px] transition',
                            entry.status === value
                                ? 'bg-paper font-semibold shadow-sm'
                                : 'font-medium text-ink-muted',
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="mt-4 flex flex-col items-center">
                <Stars
                    value={entry.rating}
                    onChange={(n) => onPatch({ rating: n })}
                />
                <p className="mt-1 text-[13px] text-ink-muted">
                    {entry.status === 'been'
                        ? entry.rating
                            ? 'Your rating'
                            : 'Not rated yet. Tap to rate'
                        : 'Rate after your visit'}
                </p>
            </div>

            <label
                htmlFor="note"
                className="mt-5 mb-1.5 block text-sm font-medium"
            >
                Private note
            </label>
            <textarea
                id="note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={() =>
                    note !== (entry.note ?? '') &&
                    onPatch({ note: note || null })
                }
                placeholder="What to order, who to bring, what to avoid"
                className="w-full rounded-input border border-line-strong bg-ivory/40 px-4 py-3 font-serif text-[18px] leading-snug text-quote italic placeholder:text-stone focus:border-ink focus:outline-none"
            />
            <p className="mt-1 text-[13px] text-ink-muted">
                Only you can see this. Saved when you tap away.
            </p>

            <button
                type="button"
                role="switch"
                aria-checked={entry.notRecommended}
                onClick={() =>
                    onPatch({ not_recommended: !entry.notRecommended })
                }
                className="mt-4 flex min-h-11 w-full items-center justify-between gap-3 text-left text-[15px]"
            >
                I don't recommend this place
                <span
                    className={cn(
                        'relative h-[26px] w-11 shrink-0 rounded-full transition',
                        entry.notRecommended
                            ? 'bg-not-recommended'
                            : 'bg-line-strong',
                    )}
                >
                    <span
                        className={cn(
                            'absolute top-[3px] size-5 rounded-full bg-paper transition-all',
                            entry.notRecommended ? 'left-[21px]' : 'left-[3px]',
                        )}
                    />
                </span>
            </button>
        </section>
    );
}

function MenuSheet({
    open,
    onOpenChange,
    restaurant,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    restaurant: Restaurant;
}) {
    const form = useForm({ url: '', kind: 'food' as MenuLink['kind'] });

    return (
        <BottomSheet open={open} onOpenChange={onOpenChange} title="View Menu">
            {restaurant.menuLinks.length > 0 ? (
                <ul className="flex flex-col gap-2">
                    {restaurant.menuLinks.map((l) => (
                        <li key={l.id} className="flex items-center gap-2">
                            <a
                                href={l.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex min-h-[58px] flex-1 items-center justify-between gap-3 rounded-card border border-line px-4"
                            >
                                <span>
                                    <span className="block text-[17px] font-medium">
                                        {MENU_KINDS[l.kind]}
                                    </span>
                                    <span className="block text-[13px] text-ink-muted">
                                        {l.source === 'verified'
                                            ? 'Verified link'
                                            : 'Added by hand'}
                                    </span>
                                </span>
                                {l.maybeStale && (
                                    <span className="rounded-full bg-warm-tint px-2.5 py-1 text-[12px] font-medium text-warm">
                                        May be outdated
                                    </span>
                                )}
                            </a>
                            {l.canDelete && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        router.delete(`/menu-links/${l.id}`, {
                                            preserveScroll: true,
                                        })
                                    }
                                    className="h-11 px-2 text-[13px] text-ink-muted underline"
                                >
                                    Remove
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="rounded-card bg-warm-tint p-4 text-[15px] text-quote">
                    No menu link yet. We only show the restaurant's own menu,
                    never a guess.
                    {restaurant.website && (
                        <>
                            {' '}
                            <a
                                href={restaurant.website}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium underline underline-offset-4"
                            >
                                Their website
                            </a>{' '}
                            may have it.
                        </>
                    )}
                </p>
            )}

            <form
                className="mt-6 flex flex-col gap-3"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.post(`/restaurants/${restaurant.id}/menu-links`, {
                        preserveScroll: true,
                        onSuccess: () => form.reset('url'),
                    });
                }}
            >
                <p className="text-sm font-medium">Add a menu link</p>
                <input
                    type="url"
                    inputMode="url"
                    placeholder="https://"
                    value={form.data.url}
                    onChange={(e) => form.setData('url', e.target.value)}
                    className={field}
                    aria-label="Menu web address"
                />
                <InputError message={form.errors.url} />
                <div className="flex gap-2">
                    <select
                        value={form.data.kind}
                        onChange={(e) =>
                            form.setData(
                                'kind',
                                e.target.value as MenuLink['kind'],
                            )
                        }
                        className={cn(field, 'flex-1')}
                        aria-label="Kind of menu"
                    >
                        {Object.entries(MENU_KINDS).map(([k, label]) => (
                            <option key={k} value={k}>
                                {label}
                            </option>
                        ))}
                    </select>
                    <button
                        type="submit"
                        disabled={form.processing || !form.data.url}
                        className="h-12 rounded-full bg-ink px-6 text-[15px] font-semibold text-paper disabled:opacity-40"
                    >
                        Add
                    </button>
                </div>
            </form>
        </BottomSheet>
    );
}

function BookSheet({
    open,
    onOpenChange,
    restaurant,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    restaurant: Restaurant;
}) {
    const booking = bookingUrl(restaurant);

    return (
        <BottomSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Book a Table"
        >
            <p className="text-[15px] text-ink-muted">
                {booking.isOwnSite
                    ? `This opens ${restaurant.name}'s own website, where you can book.`
                    : `We don't have ${restaurant.name}'s booking page yet. This searches for it.`}
            </p>
            <a
                href={booking.url}
                target="_blank"
                rel="noreferrer"
                className="mt-5 flex h-[52px] items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-paper"
            >
                {booking.isOwnSite
                    ? 'Open their booking page'
                    : 'Find their booking page'}
            </a>
            {restaurant.phone && (
                <a
                    href={`tel:${restaurant.phone}`}
                    className="mt-3 flex h-[52px] items-center justify-center rounded-full border border-ink text-[15px] font-semibold"
                >
                    Call {restaurant.phone}
                </a>
            )}
            <p className="mt-5 rounded-card bg-warm-tint p-4 text-[14px] text-quote">
                Nothing is booked until the restaurant confirms. We can't see
                live tables yet.
            </p>
        </BottomSheet>
    );
}

type Friend = { id: number; name: string; tasteTags: string[] };

function RecommendSheet({
    open,
    onOpenChange,
    restaurant,
    entry,
    friends,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    restaurant: Restaurant;
    entry: Place | null;
    friends: Friend[];
}) {
    const { shareUrl } = usePage<{ shareUrl?: string | null }>().props;
    const [picked, setPicked] = useState<number[]>([]);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const lower = (v: string | null) => (v ?? '').toLowerCase();
    const isMatch = (f: Friend) =>
        f.tasteTags.some((t) =>
            [
                lower(restaurant.cuisine),
                lower(
                    restaurant.occasion
                        ? OCCASIONS[restaurant.occasion].label
                        : null,
                ),
            ].includes(lower(t)),
        );
    const sorted = [...friends].sort(
        (a, b) => Number(isMatch(b)) - Number(isMatch(a)),
    );
    const shareText = (url: string) =>
        [
            message.trim() || null,
            `${restaurant.name} · ${placeLine(restaurant)}`,
            url,
        ]
            .filter(Boolean)
            .join('\n');

    const send = (
        extra: Record<string, FormDataConvertible>,
        onDone?: () => void,
    ) => {
        setBusy(true);
        router.post(
            `/restaurants/${restaurant.id}/recommend`,
            { message, ...extra },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => onDone?.(),
                onFinish: () => setBusy(false),
            },
        );
    };

    return (
        <BottomSheet open={open} onOpenChange={onOpenChange} title="Recommend">
            {friends.length > 0 ? (
                <div
                    className="flex flex-col gap-2"
                    role="group"
                    aria-label="Friends"
                >
                    {sorted.map((f) => {
                        const on = picked.includes(f.id);

                        return (
                            <button
                                key={f.id}
                                type="button"
                                role="checkbox"
                                aria-checked={on}
                                onClick={() =>
                                    setPicked((p) =>
                                        on
                                            ? p.filter((x) => x !== f.id)
                                            : [...p, f.id],
                                    )
                                }
                                className={cn(
                                    'flex min-h-14 items-center gap-3 rounded-[14px] border px-3 py-2 text-left transition',
                                    on ? 'border-ink bg-ivory' : 'border-line',
                                )}
                            >
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warm font-serif text-[17px] text-paper">
                                    {f.name.charAt(0)}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2 text-[16px] font-medium">
                                        {f.name}
                                        {isMatch(f) && (
                                            <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[12px] font-semibold text-brand">
                                                Good match
                                            </span>
                                        )}
                                    </span>
                                    {f.tasteTags.length > 0 && (
                                        <span className="block truncate text-[13px] text-ink-muted">
                                            Likes{' '}
                                            {f.tasteTags
                                                .join(', ')
                                                .toLowerCase()}
                                        </span>
                                    )}
                                </span>
                                <span
                                    className={cn(
                                        'flex size-6 items-center justify-center rounded-full border-[1.5px]',
                                        on
                                            ? 'border-ink bg-ink text-paper'
                                            : 'border-line-strong',
                                    )}
                                >
                                    {on && (
                                        <Check
                                            className="size-3.5"
                                            strokeWidth={2.5}
                                        />
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <p className="text-[15px] text-ink-muted">
                    <Link
                        href="/friends"
                        className="font-medium text-ink underline underline-offset-4"
                    >
                        Invite friends
                    </Link>{' '}
                    to send places inside the app. You can always share a link
                    below.
                </p>
            )}

            <label
                htmlFor="rec-message"
                className="mt-5 mb-1.5 block text-sm font-medium"
            >
                Your message{' '}
                <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <textarea
                id="rec-message"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="I know you love Italian, you should try this one"
                className="w-full rounded-input border border-line-strong bg-paper px-4 py-3 font-serif text-[18px] italic placeholder:text-stone focus:border-ink focus:outline-none"
            />
            {entry?.rating ? (
                <p className="mt-1 text-[13px] text-ink-muted">
                    Your {entry.rating}-star rating is included. Your private
                    note is not.
                </p>
            ) : (
                <p className="mt-1 text-[13px] text-ink-muted">
                    Your private note is never included.
                </p>
            )}

            {friends.length > 0 && (
                <button
                    type="button"
                    disabled={busy || picked.length === 0}
                    onClick={() =>
                        send({ to: picked }, () => {
                            setPicked([]);
                            setMessage('');
                            onOpenChange(false);
                        })
                    }
                    className="mt-4 h-[52px] w-full rounded-full bg-ink text-[15px] font-semibold text-paper transition disabled:opacity-40"
                >
                    {picked.length > 1
                        ? `Send to ${picked.length} friends`
                        : 'Send in the app'}
                </button>
            )}

            <div className="mt-6 border-t border-line pt-5">
                <p className="text-sm font-medium">Or share a link</p>
                <p className="mt-0.5 text-[13px] text-ink-muted">
                    Opens a page anyone can see, even without the app.
                </p>
                {shareUrl ? (
                    <div className="mt-3 flex flex-col gap-2">
                        <a
                            href={`https://wa.me/?text=${encodeURIComponent(shareText(shareUrl))}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-[52px] items-center justify-center rounded-full bg-brand text-[15px] font-semibold text-paper"
                        >
                            Send on WhatsApp
                        </a>
                        {'share' in navigator && (
                            <button
                                type="button"
                                onClick={() =>
                                    navigator
                                        .share({
                                            title: restaurant.name,
                                            text: shareText(shareUrl),
                                        })
                                        .catch(() => undefined)
                                }
                                className="flex h-[52px] items-center justify-center rounded-full border border-ink text-[15px] font-semibold"
                            >
                                Share another way
                            </button>
                        )}
                        <a
                            href={shareUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate text-center text-[13px] text-ink-muted underline"
                        >
                            {shareUrl}
                        </a>
                    </div>
                ) : (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => send({ public: true })}
                        className="mt-3 flex h-[52px] w-full items-center justify-center rounded-full border border-ink text-[15px] font-semibold disabled:opacity-40"
                    >
                        Create share link
                    </button>
                )}
            </div>
        </BottomSheet>
    );
}

function PlanSheet({
    open,
    onOpenChange,
    restaurant,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    restaurant: Restaurant;
}) {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const [date, setDate] = useState(iso);
    const [time, setTime] = useState('19:30');
    const [confirmed, setConfirmed] = useState(false);
    const plan = {
        name: restaurant.name,
        area: restaurant.area,
        city: restaurant.city,
        date,
        time,
        timezone: restaurant.timezone,
        confirmed,
        mapsUrl: mapsSearchUrl(restaurant),
        website: restaurant.website,
        uid: String(restaurant.id),
    };

    return (
        <BottomSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Plan a dinner"
        >
            <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium">
                    Date
                    <input
                        type="date"
                        value={date}
                        min={iso}
                        onChange={(e) => setDate(e.target.value)}
                        className={cn(field, 'mt-1.5')}
                    />
                </label>
                <label className="text-sm font-medium">
                    Time
                    <input
                        type="time"
                        value={time}
                        step={900}
                        onChange={(e) => setTime(e.target.value)}
                        className={cn(field, 'mt-1.5')}
                    />
                </label>
            </div>

            <div
                className="mt-4 grid grid-cols-2 gap-1 rounded-[14px] bg-sand p-1"
                role="radiogroup"
                aria-label="Booking status"
            >
                {(
                    [
                        [false, 'Proposed', 'No table yet'],
                        [true, 'Booking confirmed', 'The restaurant said yes'],
                    ] as const
                ).map(([value, label, hint]) => (
                    <button
                        key={label}
                        type="button"
                        role="radio"
                        aria-checked={confirmed === value}
                        onClick={() => setConfirmed(value)}
                        className={cn(
                            'min-h-[56px] rounded-[10px] px-2 text-[15px] leading-tight transition',
                            confirmed === value
                                ? 'bg-paper font-semibold shadow-sm'
                                : 'font-medium text-ink-muted',
                        )}
                    >
                        {label}
                        <span className="block text-[12px] font-normal text-ink-muted">
                            {hint}
                        </span>
                    </button>
                ))}
            </div>

            <a
                href={googleCalendarUrl(plan)}
                target="_blank"
                rel="noreferrer"
                className="mt-5 flex h-[52px] items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-paper"
            >
                Add to Google Calendar
            </a>
            <button
                type="button"
                onClick={() => downloadIcs(plan)}
                className="mt-3 flex h-[52px] w-full items-center justify-center rounded-full border border-ink text-[15px] font-semibold"
            >
                Apple or Outlook (.ics file)
            </button>
            <p className="mt-5 rounded-card bg-warm-tint p-4 text-[14px] text-quote">
                A calendar entry is not a reservation.{' '}
                {confirmed
                    ? 'Only mark it confirmed once the restaurant has said yes.'
                    : 'It is saved as a proposed dinner.'}
            </p>
        </BottomSheet>
    );
}
