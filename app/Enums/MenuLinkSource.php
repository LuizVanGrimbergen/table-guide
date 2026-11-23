<?php

namespace App\Enums;

enum MenuLinkSource: string
{
    case Verified = 'verified';
    case User = 'user';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
