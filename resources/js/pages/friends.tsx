import { Head, Link, router } from '@inertiajs/react';
import { Check, Copy, Link2, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { BottomSheet } from '@/components/tc/bottom-sheet';
import { ChoiceRow } from '@/components/tc/choice-row';
import type { Received } from '@/components/tc/received-card';
import { ReceivedCard } from '@/components/tc/received-card';
import { placeLine } from '@/lib/collection';
import { cn } from '@/lib/utils';

type Friend = {
    id: number;
    name: string;
    tasteTags: string[];
    friendshipId: number | null;
};
type Invite = { id: number; url: string; createdAt: string | null };
type Favourite = {
    id: number;
    restaurantId: number;
    name: string;
    area: string | null;
    city: string;
    cuisine: string | null;
    friend: string;
    rating: number | null;
    saved: boolean;
};

type Props = {
    friends: Friend[];
    invites: Invite[];
    received: Received[];
    favourites: Favourite[];
    me: { tasteTags: string[]; visibility: 'private' | 'friends' | 'public' };
};

const VISIBILITY = {
    private: { label: 'Only me', hint: 'Friends see nothing' },
    friends: {
        label: 'My circle',
        hint: 'Friends see your ratings and favourites, never your notes',
    },
    public: {
        label: 'Anyone with a link',
        hint: 'Ratings and favourites can be shared publicly',
    },
} as const;

const TASTE_SUGGESTIONS = [
    'Italian',
    'Pizza',
    'Japanese',
    'French',
    'Seafood',
    'Steak',
    'Fine dining',
    'Wine',
    'Asian',
    'Middle Eastern',
];

function initials(name: string) {
    return name
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

export default function FriendsPage({
    friends,
    invites,
    received,
    favourites,
    me,
}: Props) {
    const [copied, setCopied] = useState<number | null>(null);
    // When the phone won't let us copy, show the link so he can copy it.
    const [showLink, setShowLink] = useState<number | null>(null);
    const [tastesOpen, setTastesOpen] = useState(false);
    const [privacyOpen, setPrivacyOpen] = useState(false);
    const [newTag, setNewTag] = useState('');

    const copy = async (invite: Invite) => {
        try {
            await navigator.clipboard.writeText(invite.url);
            setCopied(invite.id);
            setTimeout(() => setCopied(null), 2000);
        } catch {
            setShowLink(invite.id);
        }
    };
    const saveTags = (tags: string[]) =>
        router.patch(
            '/sharing',
            { taste_tags: tags },
            { preserveScroll: true },
        );
    const toggleTag = (tag: string) =>
        saveTags(
            me.tasteTags.includes(tag)
                ? me.tasteTags.filter((t) => t !== tag)
                : [...me.tasteTags, tag],
        );

    return (
        <>
            <Head title="My Circle" />
            <div className="flex flex-col gap-8 px-5 pt-3 md:px-0 md:pt-0">
                <h1 className="font-serif text-[34px] leading-tight md:text-[36px]">
                    My Circle
                </h1>

                {/* Friends */}
                <section>
                    {friends.length > 0 ? (
                        <ul className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0">
                            {friends.map((f) => (
                                <li
                                    key={f.id}
                                    className="flex w-20 shrink-0 flex-col items-center text-center"
                                >
                                    <span className="flex size-14 items-center justify-center rounded-full bg-warm font-serif text-[20px] text-paper">
                                        {initials(f.name)}
                                    </span>
                                    <span className="mt-1.5 text-[14px] font-medium">
                                        {f.name.split(' ')[0]}
                                    </span>
                                    {f.tasteTags.length > 0 && (
                                        <span className="line-clamp-2 text-[12px] text-ink-muted">
                                            {f.tasteTags.slice(0, 2).join(', ')}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-[15px] text-ink-muted">
                            Your circle is empty. Invite the friends whose taste
                            you trust.
                        </p>
                    )}
                </section>

                {/* Invite */}
                <section className="rounded-card border border-line bg-paper p-5">
                    <h2 className="font-serif text-[22px]">Invite by link</h2>
                    <p className="mt-1 text-[15px] text-ink-muted">
                        Send a link on WhatsApp or by message. Each link works
                        for one person.
                    </p>
                    {invites.map((invite) => (
                        <div
                            key={invite.id}
                            className="mt-4 flex flex-col gap-2"
                        >
                            <a
                                href={`https://wa.me/?text=${encodeURIComponent(`Join my restaurant circle on The Collection: ${invite.url}`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex h-12 items-center justify-center rounded-full bg-brand text-[15px] font-semibold text-paper"
                            >
                                Send on WhatsApp
                            </a>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => copy(invite)}
                                    className="flex h-12 items-center justify-center gap-2 rounded-full border border-ink text-[15px] font-semibold"
                                >
                                    {copied === invite.id ? (
                                        <Check className="size-4" />
                                    ) : (
                                        <Copy
                                            className="size-4"
                                            strokeWidth={1.6}
                                        />
                                    )}
                                    {copied === invite.id
                                        ? 'Copied'
                                        : 'Copy link'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        router.delete(
                                            `/friendships/${invite.id}`,
                                            { preserveScroll: true },
                                        )
                                    }
                                    className="h-12 text-[15px] text-ink-muted underline underline-offset-4"
                                >
                                    Cancel link
                                </button>
                            </div>
                            {showLink === invite.id && (
                                <label className="block">
                                    <span className="mb-1 block text-[13px] text-ink-muted">
                                        Press and hold the link to copy it
                                    </span>
                                    <input
                                        readOnly
                                        autoFocus
                                        value={invite.url}
                                        onFocus={(e) => e.target.select()}
                                        className="h-12 w-full rounded-input border border-line-strong bg-ivory/40 px-4 text-[15px] text-ink focus:border-ink focus:outline-none"
                                    />
                                </label>
                            )}
                        </div>
                    ))}
                    {invites.length === 0 && (
                        <button
                            type="button"
                            onClick={() =>
                                router.post(
                                    '/friends/invite',
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[15px] font-semibold text-paper"
                        >
                            <Link2 className="size-5" strokeWidth={1.6} />
                            Create invite link
                        </button>
                    )}
                </section>

                {/* Received */}
                <section>
                    <h2 className="mb-3 font-serif text-[22px]">
                        Recommended to you
                    </h2>
                    {received.length > 0 ? (
                        <div className="grid gap-3 md:grid-cols-2">
                            {received.map((r) => (
                                <ReceivedCard key={r.id} rec={r} />
                            ))}
                        </div>
                    ) : (
                        <p className="rounded-card border border-dashed border-line-strong p-5 text-[15px] text-ink-muted">
                            When a friend recommends a place to you, it appears
                            here.
                        </p>
                    )}
                </section>

                {/* Friends' favourites */}
                {favourites.length > 0 && (
                    <section>
                        <h2 className="mb-3 font-serif text-[22px]">
                            Friends' favourites
                        </h2>
                        <div className="rounded-card border border-line bg-paper px-4">
                            {favourites.map((f) => (
                                <div
                                    key={f.id}
                                    className="flex min-h-[64px] items-center gap-3 border-b border-line py-2.5 last:border-0"
                                >
                                    <Link
                                        href={`/restaurants/${f.restaurantId}`}
                                        className="min-w-0 flex-1"
                                    >
                                        <span className="block truncate text-[16px] font-medium">
                                            {f.name}
                                        </span>
                                        <span className="block truncate text-sm text-ink-muted">
                                            {f.friend}'s favourite ·{' '}
                                            {placeLine(f)}
                                        </span>
                                    </Link>
                                    {f.saved ? (
                                        <span className="text-[13px] font-medium text-brand">
                                            Saved
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.post(
                                                    `/restaurants/${f.restaurantId}/save`,
                                                    {},
                                                    { preserveScroll: true },
                                                )
                                            }
                                            className="flex h-11 items-center gap-1 rounded-full border border-ink px-3 text-[14px] font-semibold"
                                        >
                                            <Plus
                                                className="size-4"
                                                strokeWidth={1.8}
                                            />{' '}
                                            Wishlist
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* My sharing */}
                <section className="rounded-card border border-line bg-paper px-5">
                    <button
                        type="button"
                        onClick={() => setTastesOpen(true)}
                        className="flex min-h-[64px] w-full items-center justify-between gap-3 border-b border-line text-left"
                    >
                        <span>
                            <span className="block text-[16px] font-medium">
                                What you like
                            </span>
                            <span className="block text-sm text-ink-muted">
                                {me.tasteTags.length
                                    ? me.tasteTags.join(', ')
                                    : 'Helps friends pick places for you'}
                            </span>
                        </span>
                        <span className="text-sm font-medium text-brand">
                            Edit
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setPrivacyOpen(true)}
                        className="flex min-h-[64px] w-full items-center justify-between gap-3 text-left"
                    >
                        <span>
                            <span className="block text-[16px] font-medium">
                                Who sees your ratings
                            </span>
                            <span className="block text-sm text-ink-muted">
                                {VISIBILITY[me.visibility].label}
                            </span>
                        </span>
                        <span className="text-sm font-medium text-brand">
                            Change
                        </span>
                    </button>
                </section>
            </div>

            <BottomSheet
                open={tastesOpen}
                onOpenChange={setTastesOpen}
                title="What you like"
                description="Friends see this when they recommend a place."
            >
                <div className="flex flex-wrap gap-2">
                    {[...new Set([...TASTE_SUGGESTIONS, ...me.tasteTags])].map(
                        (tag) => {
                            const on = me.tasteTags.includes(tag);

                            return (
                                <button
                                    key={tag}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => toggleTag(tag)}
                                    className={cn(
                                        'flex h-11 items-center gap-1.5 rounded-full border px-4 text-[15px] font-medium transition active:scale-96',
                                        on
                                            ? 'border-ink bg-ink text-paper'
                                            : 'border-line-strong bg-paper',
                                    )}
                                >
                                    {tag}
                                    {on && (
                                        <X
                                            className="size-4"
                                            strokeWidth={1.8}
                                        />
                                    )}
                                </button>
                            );
                        },
                    )}
                </div>
                <form
                    className="mt-4 flex gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (newTag.trim()) {
                            saveTags([...me.tasteTags, newTag.trim()]);
                            setNewTag('');
                        }
                    }}
                >
                    <input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Something else"
                        aria-label="Add your own"
                        className="h-12 flex-1 rounded-input border border-line-strong bg-paper px-4 text-base focus:border-ink focus:outline-none"
                    />
                    <button
                        type="submit"
                        className="h-12 rounded-full bg-ink px-5 text-[15px] font-semibold text-paper"
                    >
                        Add
                    </button>
                </form>
            </BottomSheet>

            <BottomSheet
                open={privacyOpen}
                onOpenChange={setPrivacyOpen}
                title="Who sees your ratings"
                description="Your private notes are never shared."
            >
                {(Object.keys(VISIBILITY) as (keyof typeof VISIBILITY)[]).map(
                    (v) => (
                        <ChoiceRow
                            key={v}
                            label={VISIBILITY[v].label}
                            hint={VISIBILITY[v].hint}
                            on={me.visibility === v}
                            onChoose={() => {
                                router.patch(
                                    '/sharing',
                                    { visibility: v },
                                    { preserveScroll: true },
                                );
                                setPrivacyOpen(false);
                            }}
                        />
                    ),
                )}
            </BottomSheet>
        </>
    );
}
