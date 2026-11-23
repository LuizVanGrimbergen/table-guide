import type { LucideIcon } from 'lucide-react';
import type { OccasionKey } from '@/lib/collection';

/** Line icons for the five occasions (filters, map, Home). */
export const OCCASION_ICONS: Record<OccasionKey, LucideIcon> = {
    business_lunch: Briefcase,
    special_occasions: Gem,
    casual: Sofa,
    bars: Martini,
    suburban: House,
};
import {
    Beef,
    Beer,
    Briefcase,
    Coffee,
    CookingPot,
    Croissant,
    Fish,
    Flame,
    Gem,
    House,
    Martini,
    Pizza,
    Salad,
    Sandwich,
    Sofa,
    Soup,
    UtensilsCrossed,
    Wine,
} from 'lucide-react';

/**
 * Line icons for the cuisines in his list. Matching is on lower case words so
 * "Wine bar" picks Wine before Bar. Anything unknown falls back to cutlery.
 */
const RULES: [string[], LucideIcon][] = [
    [['wine'], Wine],
    [['pub', 'german', 'belgian'], Beer],
    [['bar', 'cocktail'], Martini],
    [['pizza'], Pizza],
    [['italian'], CookingPot],
    [['japanese', 'sushi', 'seafood', 'fish'], Fish],
    [['steak', 'grill'], Beef],
    [['bbq', 'barbecue', 'mexican'], Flame],
    [['burger', 'sandwich'], Sandwich],
    [['café', 'cafe', 'coffee'], Coffee],
    [['french', 'bakery'], Croissant],
    [['greek', 'middle eastern', 'turkish', 'lebanese'], Salad],
    [['asian', 'thai', 'chinese', 'vietnamese', 'polish', 'ramen'], Soup],
];

export function cuisineIcon(cuisine: string | null): LucideIcon {
    const c = (cuisine ?? '').toLowerCase();

    for (const [words, icon] of RULES) {
        if (words.some((w) => c.includes(w))) {
            return icon;
        }
    }

    return UtensilsCrossed;
}
