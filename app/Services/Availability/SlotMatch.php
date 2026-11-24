<?php

namespace App\Services\Availability;

use App\Enums\AvailabilityStatus;

/**
 * Turns a platform's free times into what the checker shows for the
 * requested time: free, other times nearby, full or unknown. Only uses
 * times the platform returned.
 */
final class SlotMatch
{
    /** How far from the requested time an alternative may be. */
    public const int WINDOW_MINUTES = 90;

    /** How many alternatives to show. */
    public const int NEAREST = 3;

    /**
     * "requested" is the requested time when it is free; "nearest" are up
     * to 3 other free times within 90 minutes, earliest first.
     *
     * @param  array{available: bool, slots: list<string>, error: ?string}  $result
     * @return array{status: AvailabilityStatus, requested: ?string, nearest: list<string>}
     */
    public static function for(array $result, string $time): array
    {
        if ($result['error'] !== null) {
            return ['status' => AvailabilityStatus::Unknown, 'requested' => null, 'nearest' => []];
        }

        $wanted = self::minutes($time);
        $free = in_array($time, $result['slots'], true);

        $nearby = array_values(array_filter(
            $result['slots'],
            fn (string $slot) => $slot !== $time && abs(self::minutes($slot) - $wanted) <= self::WINDOW_MINUTES,
        ));

        // Closest first (earlier wins a tie), keep three, then show in time order.
        usort($nearby, fn (string $a, string $b) => [abs(self::minutes($a) - $wanted), $a] <=> [abs(self::minutes($b) - $wanted), $b]);
        $nearest = array_slice($nearby, 0, self::NEAREST);
        sort($nearest);

        $status = match (true) {
            $free => AvailabilityStatus::Available,
            $nearest !== [] => AvailabilityStatus::Alternative,
            default => AvailabilityStatus::Full,
        };

        return ['status' => $status, 'requested' => $free ? $time : null, 'nearest' => $nearest];
    }

    /** "19:30" -> 1170. */
    private static function minutes(string $time): int
    {
        [$hours, $minutes] = array_map(intval(...), explode(':', $time) + [0, 0]);

        return $hours * 60 + $minutes;
    }
}
