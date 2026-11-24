<?php

namespace App\Services\Availability;

use Carbon\CarbonImmutable;
use Throwable;

/**
 * Builds the normalised result every provider returns:
 * ['available' => bool, 'slots' => ['18:30', '19:00'], 'error' => ?string].
 *
 * Error codes (the screen turns them into words):
 * not_configured       the adapter's endpoint has not been filled in yet
 * no_venue_id          the restaurant has no venue id for its platform
 * provider_unsupported no adapter for this platform yet
 * phone                books by phone only
 * no_online_booking    no booking platform set
 * unreachable          timeout or connection failure
 * http_<code>          the platform answered with an error status
 * unexpected_response  the platform answered something we can't read
 * rate_limited         asked less than a minute ago with other choices; try again soon
 * failed               anything else
 */
final class SlotResult
{
    /**
     * @param  iterable<mixed>  $times  Anything Carbon can read as a time of day.
     * @return array{available: bool, slots: list<string>, error: null}
     */
    public static function found(iterable $times): array
    {
        $slots = [];

        foreach ($times as $time) {
            $normalised = self::normaliseTime($time);

            if ($normalised !== null) {
                $slots[$normalised] = true;
            }
        }

        $slots = array_keys($slots);
        sort($slots);

        return ['available' => $slots !== [], 'slots' => $slots, 'error' => null];
    }

    /** @return array{available: false, slots: list<string>, error: string} */
    public static function failed(string $error): array
    {
        return ['available' => false, 'slots' => [], 'error' => $error];
    }

    /** "19:00", "7:00 PM", "19:00:00" or "2026-11-24T19:00:00" become "19:00". */
    public static function normaliseTime(mixed $time): ?string
    {
        if (! is_string($time) || trim($time) === '') {
            return null;
        }

        try {
            return CarbonImmutable::parse(trim($time))->format('H:i');
        } catch (Throwable) {
            return null;
        }
    }
}
