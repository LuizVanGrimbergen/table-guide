<?php

namespace Tests\Support;

use App\Models\Restaurant;
use App\Services\Availability\SevenRoomsProvider;
use Carbon\CarbonInterface;

/**
 * SevenRooms with a made-up, known endpoint and answer shape, for tests:
 * https://booking.test/availability answers {"times": ["19:00", ...]}.
 * Everything else (booking links, error handling) is the real code.
 */
class FakePlatformProvider extends SevenRoomsProvider
{
    public function request(Restaurant $restaurant, CarbonInterface $date, int $partySize): ?array
    {
        return [
            'url' => 'https://booking.test/availability',
            'query' => ['venue' => $restaurant->booking_venue_id, 'date' => $date->format('Y-m-d'), 'party' => $partySize],
        ];
    }

    protected function times(array $json): ?array
    {
        return isset($json['times']) && is_array($json['times']) ? $json['times'] : null;
    }
}
