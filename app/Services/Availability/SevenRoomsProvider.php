<?php

namespace App\Services\Availability;

use App\Models\Restaurant;
use Carbon\CarbonInterface;

/**
 * Free tables on SevenRooms (e.g. Bistecca, venue id "bistecca").
 *
 * SevenRooms has no public API. Its booking widget loads free times from
 * an internal JSON endpoint, and that is what this adapter asks. Read on
 * 24 Nov 2026 from Bistecca's public booking page (DevTools > Network):
 *
 * GET https://www.sevenrooms.com/api-yoa/availability/ng/widget/range
 * ?venue=bistecca&party_size=4&start_date=2026-11-25&num_days=1
 * &time_slot=7:00 PM&halo_size_interval=100&channel=SEVENROOMS_WIDGET
 * &selected_lang_code=en&include_pdr=false
 *
 * {"status": 200, "data": {"availability": {"2026-11-25": [
 * {"name": "Lunch Mo-Su", "shift_category": "LUNCH", "is_closed": false,
 * "times": [{"time": "12:00", "time_iso": "2026-11-25 12:00:00",
 * "type": "book", ...}, {"time": "12:15", "type": "request", ...}]},
 * {"shift_category": "DINNER", ...}]}}}
 *
 * Only "book" times can be booked; "request" times can only be asked for
 * (the page then says no table is available), so they don't count. The
 * whole day comes back whatever time_slot says, so one answer per date and
 * party serves every time he picks.
 *
 * If SevenRooms changes this, lookups answer "unexpected_response" and the
 * screen shows "unknown". To check again: open the booking page above,
 * DevTools > Network > Fetch/XHR, pick a date, and look at the "range"
 * request. tests/Fixtures/sevenrooms-range.json holds the shape we expect.
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
        $endpoint = config('availability.sevenrooms.endpoint');

        if (! is_string($endpoint) || $endpoint === '') {
            return null;
        }

        return [
            'url' => $endpoint,
            'query' => [
                'venue' => (string) $restaurant->booking_venue_id,
                'party_size' => $partySize,
                'start_date' => $date->format('Y-m-d'),
                'num_days' => 1,
                'time_slot' => '7:00 PM',
                'halo_size_interval' => 100,
                'channel' => 'SEVENROOMS_WIDGET',
                'selected_lang_code' => 'en',
                'include_pdr' => 'false',
            ],
        ];
    }

    protected function times(array $json): ?array
    {
        $days = $json['data']['availability'] ?? null;

        if (! is_array($days)) {
            return null;
        }

        $times = [];

        foreach ($days as $shifts) {
            if (! is_array($shifts)) {
                return null;
            }

            foreach ($shifts as $shift) {
                if (! is_array($shift) || ! isset($shift['times']) || ! is_array($shift['times'])) {
                    return null;
                }

                if (($shift['is_closed'] ?? false) === true) {
                    continue;
                }

                foreach ($shift['times'] as $slot) {
                    if (is_array($slot) && ($slot['type'] ?? null) === 'book' && is_string($slot['time'] ?? null)) {
                        $times[] = $slot['time'];
                    }
                }
            }
        }

        return $times;
    }
}
