<?php

namespace App\Services\Availability;

use App\Models\Restaurant;
use Carbon\CarbonInterface;

/**
 * Free tables on Now Book It. Its booking page
 * (https://bookings.nowbookit.com/?accountid=...&venueid=11136) loads the
 * times from a JSON endpoint; read on 24 Nov 2026 from New Yamanishi's
 * page (DevTools > Network):
 *
 * GET https://api.nowbookit.com/bookings/get-schedule/venue/11136?date=2026-11-28&numofpeople=8
 *
 * {"isVenueOpen": true, "services": [{"name": "Dinner", "online": true,
 * "times": [{"name": "5:30pm", "time": "2026-11-28T17:30:00",
 * "expired": false, "isBlockOut": false,
 * "sections": [{"id": "...", "sectionState": true, "isSectionBlocked": false}]},
 * ...]}]}
 *
 * The page offers exactly the times that are not expired, not blocked out,
 * and have a section with sectionState true that isn't blocked: for 8
 * people on 28 Nov it showed 5:30 and 5:45 pm, the only two such times.
 *
 * The venue id is the number after "venueid=" in their booking link. Their
 * page doesn't take a date or time in the link, so Book opens it as saved.
 * tests/Fixtures/nowbookit-schedule.json holds the shape we expect.
 */
class NowBookItProvider extends HttpAvailabilityProvider
{
    public function request(Restaurant $restaurant, CarbonInterface $date, int $partySize): ?array
    {
        $endpoint = config('availability.nowbookit.endpoint');

        if (! is_string($endpoint) || $endpoint === '') {
            return null;
        }

        return [
            'url' => rtrim($endpoint, '/').'/'.rawurlencode((string) $restaurant->booking_venue_id),
            'query' => [
                'date' => $date->format('Y-m-d'),
                'numofpeople' => $partySize,
            ],
        ];
    }

    protected function times(array $json): ?array
    {
        $services = $json['services'] ?? null;

        if (! is_array($services)) {
            return null;
        }

        $times = [];

        foreach ($services as $service) {
            if (! is_array($service) || ! isset($service['times']) || ! is_array($service['times'])) {
                return null;
            }

            // Services the venue doesn't offer online aren't bookable here.
            if (($service['online'] ?? true) === false) {
                continue;
            }

            foreach ($service['times'] as $slot) {
                if (is_array($slot) && $this->bookable($slot) && is_string($slot['time'] ?? null)) {
                    $times[] = $slot['time'];
                }
            }
        }

        return $times;
    }

    /** @param array<mixed> $slot */
    private function bookable(array $slot): bool
    {
        if (($slot['expired'] ?? false) === true || ($slot['isBlockOut'] ?? false) === true) {
            return false;
        }

        foreach (is_array($slot['sections'] ?? null) ? $slot['sections'] : [] as $section) {
            if (is_array($section) && ($section['sectionState'] ?? false) === true && ($section['isSectionBlocked'] ?? false) !== true) {
                return true;
            }
        }

        return false;
    }
}
