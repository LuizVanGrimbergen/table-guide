<?php

use App\Enums\BookingProvider;
use App\Models\Restaurant;
use App\Services\Availability\AvailabilityManager;
use App\Services\Availability\SevenRoomsProvider;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\Support\FakePlatformProvider;
use Tests\TestCase;

uses(TestCase::class);

function restaurantOn(BookingProvider $provider, ?string $venueId = 'venue-1'): Restaurant
{
    return Restaurant::factory()->make([
        'id' => 1,
        'booking_provider' => $provider,
        'booking_venue_id' => $venueId,
    ]);
}

beforeEach(function () {
    Http::preventStrayRequests();
    $this->date = CarbonImmutable::parse('2026-11-28');
});

test('the manager picks the SevenRooms adapter and has none yet for the others', function () {
    $manager = app(AvailabilityManager::class);

    expect($manager->provider(BookingProvider::SevenRooms))->toBeInstanceOf(SevenRoomsProvider::class)
        ->and($manager->provider(BookingProvider::OpenTable))->toBeNull()
        ->and($manager->provider(BookingProvider::Phone))->toBeNull();
});

test('phone, no platform and unsupported platforms are never asked', function (BookingProvider $provider, string $error) {
    $result = app(AvailabilityManager::class)->getSlots(restaurantOn($provider), $this->date, 2);

    expect($result)->toBe(['available' => false, 'slots' => [], 'error' => $error]);
    Http::assertNothingSent();
})->with([
    [BookingProvider::Phone, 'phone'],
    [BookingProvider::None, 'no_online_booking'],
    [BookingProvider::OpenTable, 'provider_unsupported'],
]);

test('SevenRooms says not configured until its endpoint is filled in, and sends nothing', function () {
    $result = app(AvailabilityManager::class)->getSlots(restaurantOn(BookingProvider::SevenRooms), $this->date, 2);

    expect($result['error'])->toBe('not_configured')
        ->and($result['slots'])->toBe([]);
    Http::assertNothingSent();
});

test('a restaurant without a venue id is not asked', function () {
    $result = (new FakePlatformProvider)->getSlots(restaurantOn(BookingProvider::SevenRooms, null), $this->date, 2);

    expect($result['error'])->toBe('no_venue_id');
    Http::assertNothingSent();
});

test('times come back normalised, sorted and without duplicates', function () {
    Http::fake(['booking.test/*' => Http::response(['times' => ['7:30 PM', '18:00', '19:00:00', '18:00', 'nonsense']])]);

    $result = (new FakePlatformProvider)->getSlots(restaurantOn(BookingProvider::SevenRooms), $this->date, 4);

    expect($result)->toBe(['available' => true, 'slots' => ['18:00', '19:00', '19:30'], 'error' => null]);
    Http::assertSent(fn ($request) => $request['venue'] === 'venue-1'
        && $request['date'] === '2026-11-28'
        && (int) $request['party'] === 4
        && str_contains($request->header('User-Agent')[0], 'Mozilla'));
});

test('no free times is a real answer, not an error', function () {
    Http::fake(['booking.test/*' => Http::response(['times' => []])]);

    expect((new FakePlatformProvider)->getSlots(restaurantOn(BookingProvider::SevenRooms), $this->date, 2))
        ->toBe(['available' => false, 'slots' => [], 'error' => null]);
});

test('platform errors become an error code, never an empty "full" answer', function ($response, string $error) {
    Http::fake(['booking.test/*' => $response]);

    expect((new FakePlatformProvider)->getSlots(restaurantOn(BookingProvider::SevenRooms), $this->date, 2)['error'])
        ->toBe($error);
})->with([
    'server error' => [fn () => Http::response('oops', 500), 'http_500'],
    'blocked' => [fn () => Http::response('', 403), 'http_403'],
    'html instead of json' => [fn () => Http::response('<html>hi</html>', 200), 'unexpected_response'],
    'other json shape' => [fn () => Http::response(['slots' => []]), 'unexpected_response'],
    'timeout' => [fn () => throw new ConnectionException('timed out'), 'unreachable'],
]);

test('an adapter that throws only fails its own restaurant', function () {
    app()->instance(SevenRoomsProvider::class, new class extends FakePlatformProvider
    {
        public function request(Restaurant $restaurant, CarbonInterface $date, int $partySize): ?array
        {
            if ($restaurant->booking_venue_id === 'broken') {
                throw new RuntimeException('boom');
            }

            return parent::request($restaurant, $date, $partySize);
        }
    });
    Http::fake(['booking.test/*' => Http::response(['times' => ['19:00']])]);

    $broken = restaurantOn(BookingProvider::SevenRooms, 'broken');
    $fine = restaurantOn(BookingProvider::SevenRooms, 'fine');
    $fine->id = 2;

    $results = app(AvailabilityManager::class)->getMany([$broken, $fine], $this->date, 2);

    expect($results[1]['error'])->toBe('failed')
        ->and($results[2]['slots'])->toBe(['19:00']);
});

test('SevenRooms with a URL but no response reader yet says unknown, not full', function () {
    config(['availability.sevenrooms.endpoint' => 'https://booking.test/sevenrooms']);
    Http::fake(['booking.test/*' => Http::response(['anything' => true])]);

    expect(app(AvailabilityManager::class)->getSlots(restaurantOn(BookingProvider::SevenRooms), $this->date, 2)['error'])
        ->toBe('unexpected_response');
});

test('a SevenRooms booking link opens with the date, time and party filled in', function () {
    $restaurant = restaurantOn(BookingProvider::SevenRooms, 'bistecca');
    $restaurant->booking_url = 'https://www.sevenrooms.com/explore/bistecca/reservations/create/search/';

    expect(app(AvailabilityManager::class)->bookingLink($restaurant, $this->date, '19:30', 4))
        ->toBe('https://www.sevenrooms.com/explore/bistecca/reservations/create/search/?date=2026-11-28&party_size=4&start_time=19%3A30');
});

test('a SevenRooms link is built from the venue id when no booking link is saved', function () {
    $restaurant = restaurantOn(BookingProvider::SevenRooms, 'bistecca');
    $restaurant->booking_url = null;

    expect(app(AvailabilityManager::class)->bookingLink($restaurant, $this->date, '19:00', 2))
        ->toStartWith('https://www.sevenrooms.com/explore/bistecca/reservations/create/search/?date=2026-11-28');
});

test('other booking links are used as they are, then the website', function () {
    $restaurant = restaurantOn(BookingProvider::Phone, null);
    $restaurant->booking_url = 'https://bistecca.com.au/book';
    $restaurant->website = 'https://bistecca.com.au';
    $manager = app(AvailabilityManager::class);

    expect($manager->bookingLink($restaurant, $this->date, '19:00', 2))->toBe('https://bistecca.com.au/book');

    $restaurant->booking_url = null;
    expect($manager->bookingLink($restaurant, $this->date, '19:00', 2))->toBe('https://bistecca.com.au');

    // A SevenRooms place whose saved link is some other page keeps that page.
    $other = restaurantOn(BookingProvider::SevenRooms, 'bistecca');
    $other->booking_url = 'https://bistecca.com.au/reservations';
    expect($manager->bookingLink($other, $this->date, '19:00', 2))->toBe('https://bistecca.com.au/reservations');
});

describe('several restaurants at once', function () {
    beforeEach(function () {
        // A SevenRooms whose endpoint is known, so the plumbing can be tested.
        app()->instance(SevenRoomsProvider::class, new FakePlatformProvider);
        $this->manager = app(AvailabilityManager::class);
        $this->places = collect(range(1, 3))->map(function (int $id) {
            $r = restaurantOn(BookingProvider::SevenRooms, "venue-{$id}");
            $r->id = $id;

            return $r;
        });
    });

    test('all platforms are asked in one go and each gets its own answer', function () {
        Http::fake(function ($request) {
            return match ($request['venue']) {
                'venue-1' => Http::response(['times' => ['19:00']]),
                'venue-2' => Http::response('down', 503),
                default => Http::response(['times' => []]),
            };
        });

        $results = $this->manager->getMany($this->places, $this->date, 2);

        expect(array_keys($results))->toBe([1, 2, 3])
            ->and($results[1]['slots'])->toBe(['19:00'])
            ->and($results[2]['error'])->toBe('http_503')
            ->and($results[3])->toBe(['available' => false, 'slots' => [], 'error' => null]);
        Http::assertSentCount(3);
    });

    test('a restaurant that times out does not hold up the others', function () {
        Http::fake(function ($request) {
            if ($request['venue'] === 'venue-2') {
                throw new ConnectionException('timed out');
            }

            return Http::response(['times' => ['19:00']]);
        });

        $results = $this->manager->getMany($this->places, $this->date, 2);

        expect($results[1]['slots'])->toBe(['19:00'])
            ->and($results[2]['error'])->toBe('unreachable')
            ->and($results[3]['slots'])->toBe(['19:00']);
    });

    test('answers are cached for five minutes per restaurant, date and party', function () {
        Http::fake(['booking.test/*' => Http::response(['times' => ['19:00']])]);

        $this->manager->getMany($this->places, $this->date, 2);
        $this->travel(4)->minutes();
        $again = $this->manager->getMany($this->places, $this->date, 2);

        expect($again[1]['slots'])->toBe(['19:00']);
        Http::assertSentCount(3);

        $this->travel(2)->minutes();
        $this->manager->getMany($this->places, $this->date, 2);
        Http::assertSentCount(6);
    });

    test('a restaurant is asked at most once a minute, even for other choices', function () {
        Http::fake(['booking.test/*' => Http::response(['times' => ['19:00']])]);

        $this->manager->getMany($this->places, $this->date, 2);
        $other = $this->manager->getMany($this->places, $this->date, 4);

        expect($other[1]['error'])->toBe('rate_limited');
        Http::assertSentCount(3);

        $this->travel(61)->seconds();
        expect($this->manager->getMany($this->places, $this->date, 4)[1]['slots'])->toBe(['19:00']);
        Http::assertSentCount(6);
    });

    test('errors are not cached', function () {
        Http::fake(['booking.test/*' => Http::sequence()
            ->push('down', 503)->push('down', 503)->push('down', 503)
            ->whenEmpty(Http::response(['times' => ['20:00']]))]);

        expect($this->manager->getMany($this->places, $this->date, 2)[1]['error'])->toBe('http_503');

        $this->travel(61)->seconds();
        expect($this->manager->getMany($this->places, $this->date, 2)[1]['slots'])->toBe(['20:00']);
    });

    test('changing the booking details asks again straight away from cache', function () {
        Http::fake(['booking.test/*' => Http::response(['times' => ['19:00']])]);

        $this->manager->getMany($this->places, $this->date, 2);
        $this->places[0]->booking_venue_id = 'venue-renamed';
        $this->travel(61)->seconds();
        $this->manager->getMany($this->places, $this->date, 2);

        Http::assertSent(fn ($request) => $request['venue'] === 'venue-renamed');
    });
});
