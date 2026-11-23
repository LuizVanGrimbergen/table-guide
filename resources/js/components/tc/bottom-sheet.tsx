import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
};

/**
 * Paper sheet that rises from the bottom (centred card on desktop):
 * grab handle, Newsreader title, close button.
 */
export function BottomSheet({
    open,
    onOpenChange,
    title,
    description,
    children,
    className,
}: Props) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
                <Dialog.Content
                    className={cn(
                        'fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-sheet bg-paper text-ink shadow-[0_-8px_30px_rgba(30,27,24,0.15)] outline-none',
                        'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:duration-240 data-[state=open]:ease-out data-[state=open]:slide-in-from-bottom',
                        'md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-sheet md:data-[state=open]:slide-in-from-bottom-4',
                        className,
                    )}
                >
                    <div className="flex justify-center pt-3 md:hidden">
                        <span className="h-1.5 w-10 rounded-full bg-line-strong" />
                    </div>
                    <div className="flex items-start justify-between gap-4 px-5 pt-3 pb-2 md:px-7 md:pt-6">
                        <div>
                            <Dialog.Title className="font-serif text-[26px] leading-tight">
                                {title}
                            </Dialog.Title>
                            {description ? (
                                <Dialog.Description className="mt-1 text-sm text-ink-muted">
                                    {description}
                                </Dialog.Description>
                            ) : (
                                <Dialog.Description className="sr-only">
                                    {title}
                                </Dialog.Description>
                            )}
                        </div>
                        <Dialog.Close
                            className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-sand active:scale-96"
                            aria-label="Close"
                        >
                            <X className="size-5" strokeWidth={1.6} />
                        </Dialog.Close>
                    </div>
                    <div className="overflow-y-auto overscroll-contain px-5 pb-[max(24px,env(safe-area-inset-bottom))] md:px-7 md:pb-7">
                        {children}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
