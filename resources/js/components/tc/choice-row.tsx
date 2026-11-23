import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
    label: string;
    hint?: string;
    count?: number;
    on: boolean;
    onChoose: () => void;
    multi?: boolean;
};

/** Large row in a picker sheet: label, one-line hint, count, round check. */
export function ChoiceRow({ label, hint, count, on, onChoose, multi }: Props) {
    return (
        <button
            type="button"
            role={multi ? 'checkbox' : 'radio'}
            aria-checked={on}
            onClick={onChoose}
            className="flex min-h-[58px] w-full items-center gap-3 border-b border-line py-2 text-left transition last:border-0 active:opacity-80"
        >
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
                        ? 'border-olive bg-olive text-paper'
                        : 'border-line-strong',
                )}
            >
                {on && <Check className="size-3.5" strokeWidth={2.5} />}
            </span>
        </button>
    );
}
