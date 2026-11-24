<?php

namespace App\Enums;

/**
 * Which system a restaurant takes bookings through. Only the online
 * platforms can be asked for free tables; phone and none never can.
 */
enum BookingProvider: string
{
    case SevenRooms = 'sevenrooms';
    case OpenTable = 'opentable';
    case NowBookIt = 'nowbookit';
    case ResDiary = 'resdiary';
    case Phone = 'phone';
    case None = 'none';

    public function label(): string
    {
        return match ($this) {
            self::SevenRooms => 'SevenRooms',
            self::OpenTable => 'OpenTable',
            self::NowBookIt => 'Now Book It',
            self::ResDiary => 'ResDiary',
            self::Phone => 'By phone',
            self::None => 'Not set',
        };
    }

    /** Whether free tables can be looked up online for this provider. */
    public function isOnline(): bool
    {
        return ! in_array($this, [self::Phone, self::None], true);
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
