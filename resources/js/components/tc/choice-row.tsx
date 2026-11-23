import type { LucideIcon } from 'lucide-react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
    label: string;
    hint?: string;
    count?: number;
    on: boolean;
    onChoose: () => void;
    multi?: boolean;
    icon?: LucideIcon;
};

/** Large row in a picker sheet: label, one-line hint, count, round check. */
export function ChoiceRow({
    label,
    hint,
    count,
    on,
    onChoose,
    multi,
    icon: Icon,
}: Props) {
    return (
        <button
            type="button"
            role={multi ? 'checkbox' : 'radio'}
            aria-checked={on}
            onClick={onChoose}
            className="flex min-h-[58px] w-full items-center gap-3 border-b border-line py-2 text-left transition last:border-0 active:opacity-80"
        >
            {Icon && (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sand text-ink">
                    <Icon className="size-[18px]" strokeWidth={1.6} />
                </span>
            )}
            <span className="min-w-0 flex-1">
                <span
                    className={cn(
                        'block text-[17px] leading-snug',
                        on && 'font-semibold',
                    )}
                >
                    {label}
                </span>
                {hint && (
                    <span className="block text-[13px] text-ink-muted">
                        {hint}
                    </span>
                )}
            </span>
            {count !== undefined && (
                <span className="text-sm text-ink-muted tabular-nums">
                    {count}
                </span>
            )}
            <span
                className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px]',
                    on
                        ? 'border-brand bg-brand text-paper'
                        : 'border-line-strong',
                )}
            >
                {on && <Check className="size-3.5" strokeWidth={2.5} />}
            </span>
        </button>
    );
}
