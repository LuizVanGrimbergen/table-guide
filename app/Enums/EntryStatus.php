<?php

namespace App\Enums;

enum EntryStatus: string
{
    case Been = 'been';
    case Wish = 'wish';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
