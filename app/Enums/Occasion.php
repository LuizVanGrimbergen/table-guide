<?php

namespace App\Enums;

enum Occasion: string
{
    case BusinessLunch = 'business_lunch';
    case SpecialOccasions = 'special_occasions';
    case Casual = 'casual';
    case Bars = 'bars';
    case Suburban = 'suburban';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
