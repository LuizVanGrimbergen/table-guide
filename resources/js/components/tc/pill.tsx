import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    children: ReactNode;
    active?: boolean;
    onClick?: () => void;
    chevron?: boolean;
    className?: string;
    label?: string;
};

/** 44px filter pill. Cognac when active. */
export function Pill({
    children,
    active,
    onClick,
    chevron,
    className,
    label,
}: Props) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            aria-pressed={chevron ? undefined : active}
            className={cn(
                'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[15px] font-semibold whitespace-nowrap transition duration-120 active:scale-96 active:opacity-80',
                active
                    ? 'border-brand bg-brand text-paper'
                    : 'border-line-strong bg-paper text-ink',
                chevron && 'pr-3',
                className,
            )}
        >
            {children}
            {chevron && (
                <ChevronDown
                    className={cn(
                        'size-4',
                        active ? 'text-paper/70' : 'text-ink-muted',
                    )}
                    strokeWidth={1.8}
                />
            )}
        </button>
    );
}
