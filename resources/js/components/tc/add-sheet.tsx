import { Link, useForm, usePage } from '@inertiajs/react';
import { MapPin } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import type { Place } from '@/lib/collection';
import { placeLine } from '@/lib/collection';
import { cn } from '@/lib/utils';
import { BottomSheet } from './bottom-sheet';

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

const fieldClass =
    'h-12 w-full rounded-input border border-line-strong bg-paper px-4 text-base text-ink placeholder:text-stone focus:border-ink focus:outline-none';

/**
 * Manual add with a duplicate check. Google Places search slots in here
 * once a server key is configured (build step 9).
 */
export function AddSheet({ open, onOpenChange }: Props) {
    const { places, homeCity, placesSearch } = usePage<{
        places?: Place[];
        homeCity?: string;
        placesSearch?: boolean;
    }>().props;
    const form = useForm({
        name: '',
        city: homeCity ?? 'Sydney',
        area: '',
        status: 'wish' as 'wish' | 'been',
        note: '',
        google_place_id: '',
        address: '',
        lat: '' as number | '',
        lng: '' as number | '',
    });
    const google = useGoogleSearch(
        placesSearch && !form.data.google_place_id ? form.data.name : '',
        homeCity,
    );
    const pick = (r: GoogleResult) => {
        form.setData((d) => ({
            ...d,
            name: r.name,
            city: r.city ?? d.city,
            area: r.area ?? '',
            google_place_id: r.placeId,
            address: r.address ?? '',
            lat: r.lat ?? '',
            lng: r.lng ?? '',
        }));
    };
    const unpick = () =>
        form.setData((d) => ({
            ...d,
            google_place_id: '',
            address: '',
            lat: '',
            lng: '',
        }));

    const query = form.data.name.trim().toLowerCase();
    const duplicates = useMemo(
        () =>
            query.length > 1 && places
                ? places
                      .filter((p) => p.name.toLowerCase().includes(query))
                      .slice(0, 3)
                : [],
        [query, places],
    );
    const exact = duplicates.some(
        (p) =>
            p.name.toLowerCase() === query &&
            p.city.toLowerCase() === form.data.city.trim().toLowerCase(),
    );

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/restaurants', {
            onSuccess: () => {
                form.reset();
                onOpenChange(false);
            },
        });
    };

    return (
        <BottomSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Add a restaurant"
        >
            <form onSubmit={submit} className="flex flex-col gap-4 pt-2">
                <div>
                    <label
                        htmlFor="add-name"
                        className="mb-1.5 block text-sm font-medium"
                    >
                        Name
                    </label>
                    <input
                        id="add-name"
                        autoFocus
                        autoComplete="off"
                        className={fieldClass}
                        placeholder="Restaurant name"
                        value={form.data.name}
                        onChange={(e) => {
                            unpick();
                            form.setData('name', e.target.value);
                        }}
                    />
                    <InputError message={form.errors.name} />
                    {form.data.google_place_id && (
                        <p className="mt-2 flex items-start gap-2 text-[14px] text-ink-muted">
                            <MapPin
                                className="mt-0.5 size-4 shrink-0 text-brand"
                                strokeWidth={1.6}
                            />
                            {form.data.address}
                        </p>
                    )}
                </div>

                {google.results.length > 0 && (
                    <div className="rounded-card border border-line">
                        <ul>
                            {google.results.map((r) => (
                                <li key={r.placeId}>
                                    <button
                                        type="button"
                                        onClick={() => pick(r)}
                                        className="flex min-h-[58px] w-full flex-col justify-center border-b border-line px-4 py-2 text-left"
                                    >
                                        <span className="text-[16px] font-medium">
                                            {r.name}
                                        </span>
                                        <span className="truncate text-[13px] text-ink-muted">
                                            {r.address}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <p className="px-4 py-2 text-right text-[12px] text-ink-muted">
                            Results from Google
                        </p>
                    </div>
                )}
                {google.error && (
                    <p className="text-[14px] text-warm">{google.error}</p>
                )}

                {duplicates.length > 0 && (
                    <div className="rounded-card bg-warm-tint p-4">
                        <p className="mb-2 text-sm font-medium text-warm">
                            Already in your collection?
                        </p>
                        <ul className="flex flex-col gap-1">
                            {duplicates.map((p) => (
                                <li key={p.id}>
                                    <Link
                                        href={`/restaurants/${p.restaurantId}`}
                                        onClick={() => onOpenChange(false)}
                                        className="flex min-h-11 items-center justify-between gap-3 text-[15px]"
                                    >
                                        <span className="font-medium">
                                            {p.name}
                                        </span>
                                        <span className="text-sm text-ink-muted">
                                            {placeLine(p)}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label
                            htmlFor="add-city"
                            className="mb-1.5 block text-sm font-medium"
                        >
                            City
                        </label>
                        <input
                            id="add-city"
                            className={fieldClass}
                            value={form.data.city}
                            onChange={(e) =>
                                form.setData('city', e.target.value)
                            }
                        />
                        <InputError message={form.errors.city} />
                    </div>
                    <div>
                        <label
                            htmlFor="add-area"
                            className="mb-1.5 block text-sm font-medium"
                        >
                            Area{' '}
                            <span className="font-normal text-ink-muted">
                                (optional)
                            </span>
                        </label>
                        <input
                            id="add-area"
                            className={fieldClass}
                            placeholder="e.g. Surry Hills"
                            value={form.data.area}
                            onChange={(e) =>
                                form.setData('area', e.target.value)
                            }
                        />
                    </div>
                </div>

                <div
                    className="grid grid-cols-2 gap-1 rounded-[14px] bg-sand p-1"
                    role="radiogroup"
                    aria-label="Status"
                >
                    {(
                        [
                            ['wish', 'Wishlist'],
                            ['been', 'Been there'],
                        ] as const
                    ).map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={form.data.status === value}
                            onClick={() => form.setData('status', value)}
                            className={cn(
                                'min-h-11 rounded-[10px] text-[15px] font-medium transition',
                                form.data.status === value
                                    ? 'bg-paper font-semibold shadow-sm'
                                    : 'text-ink-muted',
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div>
                    <label
                        htmlFor="add-note"
                        className="mb-1.5 block text-sm font-medium"
                    >
                        Note{' '}
                        <span className="font-normal text-ink-muted">
                            (private)
                        </span>
                    </label>
                    <textarea
                        id="add-note"
                        rows={2}
                        className={cn(
                            fieldClass,
                            'h-auto py-3 font-serif text-[17px] italic',
                        )}
                        placeholder={
                            form.data.status === 'wish'
                                ? 'Why you want to go, who recommended it'
                                : 'What was good'
                        }
                        value={form.data.note}
                        onChange={(e) => form.setData('note', e.target.value)}
                    />
                </div>

                <button
                    type="submit"
                    disabled={form.processing || query.length < 2 || exact}
                    className="h-[52px] rounded-full bg-ink text-base font-semibold text-paper transition duration-120 active:scale-96 active:opacity-80 disabled:opacity-40"
                >
                    {exact ? 'Already saved' : 'Save'}
                </button>
                {!placesSearch && (
                    <p className="text-center text-[13px] text-ink-muted">
                        Address search turns on once Google is connected.
                    </p>
                )}
            </form>
        </BottomSheet>
    );
}

type GoogleResult = {
    placeId: string;
    name: string;
    address: string | null;
    city: string | null;
    area: string | null;
    lat: number | null;
    lng: number | null;
};

/** Debounced Places search through our own server (the key stays there). */
function useGoogleSearch(query: string, city?: string) {
    const [results, setResults] = useState<GoogleResult[]>([]);
    const [error, setError] = useState<string | null>(null);
    const q = query.trim();

    useEffect(() => {
        if (q.length < 3) {
            setResults([]);
            setError(null);

            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(() => {
            const params = new URLSearchParams({ q, city: city ?? '' });
            fetch(`/places/search?${params.toString()}`, {
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            })
                .then(async (res) => {
                    const body = (await res.json()) as {
                        results?: GoogleResult[];
                        error?: string;
                    };
                    setResults(body.results ?? []);
                    setError(body.error ?? null);
                })
                .catch((e: unknown) => {
                    if ((e as Error).name !== 'AbortError') {
                        setError(
                            'Search is unavailable. You can still add it by hand.',
                        );
                    }
                });
        }, 400);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [q, city]);

    return { results, error };
}
