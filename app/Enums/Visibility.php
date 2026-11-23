<?php

namespace App\Enums;

enum Visibility: string
{
    case Private = 'private';
    case Friends = 'friends';
    case Public = 'public';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
