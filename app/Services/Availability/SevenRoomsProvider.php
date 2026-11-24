<?php

namespace App\Services\Availability;

use App\Models\Restaurant;
use Carbon\CarbonInterface;

/**
 * Free tables on SevenRooms (e.g. Bistecca, venue id "bistecca").
 *
 * SevenRooms has no public API. Its booking widget loads free times from
 * an internal JSON endpoint, and that is what this adapter asks. Until the
 * TODOs below are filled in, every lookup answers "not_configured" and the
 * screen shows "unknown": nothing is ever guessed.
 *
 * ---------------------------------------------------------------------------
 * HOW TO FIND THE ENDPOINT (about 5 minutes, on a computer, in Chrome)
 * ---------------------------------------------------------------------------
 * 1. Open a SevenRooms restaurant's booking page, for example
 *    https://www.sevenrooms.com/explore/bistecca/reservations/create/search/
 * 2. Open DevTools (Cmd+Option+I), tab "Network", and tick "Fetch/XHR".
 *    Click the clear button (circle with a line) so the list is empty.
 * 3. On the page, pick a date and a number of guests, so it shows times.
 * 4. In the Network list, click the request that appeared just then. Look
 *    in its "Response" (or "Preview") tab for the times you see on screen.
 * 5. From that request, copy into this file:
 *    - the URL without the "?..." part -> SEVENROOMS_AVAILABILITY_URL in .env
 *    - the names of the query parameters for the venue, the date, the number
 *      of people (and anything else it always sends) -> request()
 *    - the date format it uses (e.g. 2026-11-24 or 11-24-2026)
 *    - where in the response the free times sit -> times()
 * 6. Save one real response as tests/Fixtures/sevenrooms-availability.json
 *    and add a test that reads it, so a change on their side shows up.
 *
 * Never fill these in from memory or from a blog post: only from what the
 * real booking page sends today.
 */
class SevenRoomsProvider extends HttpAvailabilityProvider implements PrefillsBookingLink
{
    /**
     * Seen working on 24 Nov 2026 on Bistecca's public booking page: it
     * opens with the guests, date and time chosen when given
     * ?date=2026-11-29&party_size=3&start_time=20:00. Nothing is booked:
     * he still checks the details and confirms on their page.
     */
    public function bookingLink(Restaurant $restaurant, CarbonInterface $date, string $time, int $partySize): ?string
    {
        $base = $restaurant->booking_url;

        if (blank($base) && filled($restaurant->booking_venue_id)) {
            $base = 'https://www.sevenrooms.com/explore/'.rawurlencode((string) $restaurant->booking_venue_id).'/reservations/create/search/';
        }

        if (! is_string($base) || ! preg_match('#^https://www\.sevenrooms\.com/explore/[^/?]+/reservations/create/search/?(\?.*)?$#', $base)) {
            return $base ?: null;
        }

        $path = strtok($base, '?');

        return $path.'?'.http_build_query([
            'date' => $date->format('Y-m-d'),
            'party_size' => $partySize,
            'start_time' => $time,
        ]);
    }

    public function request(Restaurant $restaurant, CarbonInterface $date, int $partySize): ?array
    {
        // TODO(availability): set SEVENROOMS_AVAILABILITY_URL in .env to the
        // URL from step 5 (see config/availability.php).
        $endpoint = config('availability.sevenrooms.endpoint');

        if (! is_string($endpoint) || $endpoint === '') {
            return null;
        }

        return [
            'url' => $endpoint,
            'query' => [
                // TODO(availability): use the real parameter names from step 5, e.g.
                // '<venue param>' => $restaurant->booking_venue_id,
                // '<date param>' => $date->format('<their date format>'),
                // '<party param>' => $partySize,
            ],
        ];
    }

    protected function times(array $json): ?array
    {
        // TODO(availability): return the bookable times from the response, as
        // strings like "19:00" or "7:00 PM", from step 5. Only count times
        // the platform marks as bookable for this party. Return null when
        // the shape isn't what you expect, so the screen says "unknown".
        return null;
    }
}
