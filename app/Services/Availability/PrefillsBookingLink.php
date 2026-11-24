<?php

namespace App\Services\Availability;

use App\Models\Restaurant;
use Carbon\CarbonInterface;

/**
 * A platform whose public booking page can open with the date, time and
 * party already chosen. Only for parameters seen working on the real page.
 */
interface PrefillsBookingLink
{
    /** The booking page with the choice filled in, or null if we can't. */
    public function bookingLink(Restaurant $restaurant, CarbonInterface $date, string $time, int $partySize): ?string;
}
