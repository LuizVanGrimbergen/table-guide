import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
    value: number | null;
    onChange?: (value: number) => void;
    size?: 'sm' | 'lg';
};

export function Stars({ value, onChange, size = 'lg' }: Props) {
    const icon = size === 'lg' ? 'size-7' : 'size-4';

    return (
        <div
            className="flex items-center"
            role={onChange ? 'radiogroup' : 'img'}
            aria-label={
                onChange ? 'Your rating' : `${value ?? 0} out of 5 stars`
            }
        >
            {[1, 2, 3, 4, 5].map((n) => {
                const filled = n <= (value ?? 0);
                const star = (
                    <Star
                        className={cn(icon, 'text-burgundy')}
                        fill={filled ? 'currentColor' : 'none'}
                        strokeWidth={1.5}
                    />
                );

                return onChange ? (
                    <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={value === n}
                        aria-label={`Rate ${n} of 5`}
                        onClick={() => onChange(n)}
                        className="flex size-11 items-center justify-center transition active:scale-90"
                    >
                        {star}
                    </button>
                ) : (
                    <span key={n}>{star}</span>
                );
            })}
        </div>
    );
}
