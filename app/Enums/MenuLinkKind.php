<?php

namespace App\Enums;

enum MenuLinkKind: string
{
    case Food = 'food';
    case Drinks = 'drinks';
    case Wine = 'wine';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
