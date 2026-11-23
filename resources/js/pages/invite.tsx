import { Head, Link, router } from '@inertiajs/react';

type Props = { token: string; from: string; alreadyFriends: boolean };

export default function InvitePage({ token, from, alreadyFriends }: Props) {
    return (
        <>
            <Head title={`${from} invites you`} />
            <div className="mx-auto max-w-md px-5 pt-10 text-center md:pt-16">
                <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-warm font-serif text-[30px] text-paper">
                    {from.charAt(0)}
                </span>
                <h1 className="mt-5 font-serif text-[30px] leading-tight">
                    {from} invites you to their circle
                </h1>
                <p className="mt-2 text-[15px] text-ink-muted">
                    You'll be able to send each other restaurant recommendations
                    and see the favourites you each choose to share. Your
                    private notes stay private.
                </p>
                {alreadyFriends ? (
                    <Link
                        href="/friends"
                        className="mt-8 flex h-[52px] items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-paper"
                    >
                        You're already friends
                    </Link>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={() =>
                                router.post(`/invite/${token}/accept`)
                            }
                            className="mt-8 h-[52px] w-full rounded-full bg-ink text-[15px] font-semibold text-paper transition duration-120 active:scale-96"
                        >
                            Accept
                        </button>
                        <Link
                            href="/"
                            className="mt-3 flex h-[52px] items-center justify-center text-[15px] font-medium text-ink-muted underline underline-offset-4"
                        >
                            Not now
                        </Link>
                    </>
                )}
            </div>
        </>
    );
}
