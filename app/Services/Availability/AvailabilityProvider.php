<?php

namespace App\Services\Availability;

use App\Models\Restaurant;
use Carbon\CarbonInterface;

/**
 * One booking platform (SevenRooms, OpenTable, ...). Asks it which times
 * are free for a party on a date, and answers in one shape for all.
 *
 * Never guesses: when the platform can't be asked or answers something we
 * don't understand, the result carries an error and no slots.
 */
interface AvailabilityProvider
{
    /**
     * Slots are "HH:MM" in the restaurant's local time, sorted.
     *
     * @return array{available: bool, slots: list<string>, error: ?string}
     */
    public function getSlots(Restaurant $restaurant, CarbonInterface $date, int $partySize): array;
}
