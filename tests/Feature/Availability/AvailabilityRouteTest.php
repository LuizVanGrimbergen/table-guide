<?php

use App\Enums\BookingProvider;
use App\Models\Restaurant;
use App\Models\SavedEntry;
use App\Models\User;
use App\Services\Availability\SevenRoomsProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\Support\FakePlatformProvider;

uses(RefreshDatabase::class);

beforeEach(function () {
    Http::preventStrayRequests();
    // SevenRooms with a known endpoint and answer, so no real platform is asked.
    app()->instance(SevenRoomsProvider::class, new FakePlatformProvider);

    $this->user = User::factory()->create();
    $this->query = ['date' => now()->addDays(3)->format('Y-m-d'), 'time' => '19:00', 'party' => 2];

    $add = function (string $name, array $restaurant, bool $inChecker = true) {
        $r = Restaurant::factory()->create(['name' => $name, ...$restaurant]);
        SavedEntry::factory()->for($this->user)->for($r)->create(['in_checker' => $inChecker]);

        return $r;
    };

    $this->free = $add('Bistecca', ['booking_provider' => BookingProvider::SevenRooms, 'booking_venue_id' => 'bistecca', 'booking_url' => null]);
    $this->nearby = $add('Cafe Nearby', ['booking_provider' => BookingProvider::SevenRooms, 'booking_venue_id' => 'nearby']);
    $this->full = $add('Dead Full', ['booking_provider' => BookingProvider::SevenRooms, 'booking_venue_id' => 'full']);
    $this->phone = $add('Eat By Phone', ['booking_provider' => BookingProvider::Phone, 'phone' => '+61 2 1234 5678']);
    $this->down = $add('Fails A Lot', ['booking_provider' => BookingProvider::SevenRooms, 'booking_venue_id' => 'down']);
    $this->notInChecker = $add('Not Ticked', ['booking_provider' => BookingProvider::SevenRooms, 'booking_venue_id' => 'not-ticked'], false);

    Http::fake(fn ($request) => match ($request['venue']) {
        'bistecca' => Http::response(['times' => ['18:30', '19:00', '19:30', '22:00']]),
        'nearby' => Http::response(['times' => ['18:15', '20:00']]),
        'full' => Http::response(['times' => []]),
        'down' => Http::response('oops', 500),
        default => Http::response(['times' => ['19:00']]),
    });
});

test('it shows every restaurant in his checker with its status', function () {
    $response = $this->actingAs($this->user)
        ->getJson('/availability?'.http_build_query($this->query))
        ->assertOk();

    $byName = collect($response->json('restaurants'))->keyBy('name');

    expect($byName->keys()->all())->toBe(['Bistecca', 'Cafe Nearby', 'Dead Full', 'Eat By Phone', 'Fails A Lot'])
        ->and($byName['Bistecca']['status'])->toBe('available')
        ->and($byName['Bistecca']['requested']['time'])->toBe('19:00')
        ->and(collect($byName['Bistecca']['nearest'])->pluck('time')->all())->toBe(['18:30', '19:30'])
        ->and($byName['Cafe Nearby']['status'])->toBe('alternative')
        ->and(collect($byName['Cafe Nearby']['nearest'])->pluck('time')->all())->toBe(['18:15', '20:00'])
        ->and($byName['Dead Full']['status'])->toBe('full')
        ->and($byName['Eat By Phone']['status'])->toBe('unknown')
        ->and($byName['Eat By Phone']['error'])->toBe('phone')
        ->and($byName['Eat By Phone']['phone'])->toBe('+61 2 1234 5678')
        ->and($byName['Fails A Lot']['status'])->toBe('unknown')
        ->and($byName['Fails A Lot']['error'])->toBe('http_500');

    // Four platform lookups, all in one go; the phone-only place is not asked.
    Http::assertSentCount(4);
});

test('every time links to the booking page with that time filled in', function () {
    $response = $this->actingAs($this->user)->getJson('/availability?'.http_build_query($this->query));
    $bistecca = collect($response->json('restaurants'))->firstWhere('name', 'Bistecca');
    $date = $this->query['date'];

    expect($bistecca['requested']['bookingUrl'])
        ->toBe("https://www.sevenrooms.com/explore/bistecca/reservations/create/search/?date={$date}&party_size=2&start_time=19%3A00")
        ->and($bistecca['nearest'][0]['bookingUrl'])->toContain('start_time=18%3A30');
});

test('one restaurant can be checked on its own', function () {
    $this->actingAs($this->user)
        ->getJson("/availability/{$this->nearby->id}?".http_build_query($this->query))
        ->assertOk()
        ->assertJsonPath('name', 'Cafe Nearby')
        ->assertJsonPath('status', 'alternative');

    Http::assertSentCount(1);
});

test('a restaurant he does not keep cannot be checked', function () {
    $other = Restaurant::factory()->create(['booking_provider' => BookingProvider::SevenRooms, 'booking_venue_id' => 'x']);

    $this->actingAs($this->user)
        ->getJson("/availability/{$other->id}?".http_build_query($this->query))
        ->assertNotFound();

    Http::assertNothingSent();
});

test('another user only sees their own checker', function () {
    $this->actingAs(User::factory()->create())
        ->getJson('/availability?'.http_build_query($this->query))
        ->assertOk()
        ->assertJsonPath('restaurants', []);
});

test('the choice is validated', function (array $query, string $field) {
    $this->actingAs($this->user)
        ->getJson('/availability?'.http_build_query([...$this->query, ...$query]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);
})->with([
    'no date' => [['date' => ''], 'date'],
    'wrong date format' => [['date' => '28/11/2026'], 'date'],
    'last week' => [['date' => now()->subWeek()->format('Y-m-d')], 'date'],
    'wrong time' => [['time' => '7pm'], 'time'],
    'nobody' => [['party' => 0], 'party'],
    'too many' => [['party' => 9], 'party'],
]);

test('guests are sent to log in', function () {
    $this->getJson('/availability?'.http_build_query($this->query))->assertUnauthorized();
});

test('the Free tables page lists his checker places without asking any platform', function () {
    $this->actingAs($this->user)
        ->get('/tables?party=4&time=20:15')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('tables')
            ->has('restaurants', 5)
            ->where('restaurants.0.name', 'Bistecca')
            ->where('restaurants.0.providerLabel', 'SevenRooms')
            ->where('initial.party', 4)
            ->where('initial.time', '20:15'));

    Http::assertNothingSent();
});

test('the Free tables page ignores nonsense in the link', function () {
    $this->actingAs($this->user)
        ->get('/tables?party=99&time=7pm&date=tomorrow')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('initial.party', 2)
            ->where('initial.date', fn (string $date) => (bool) preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)));
});
