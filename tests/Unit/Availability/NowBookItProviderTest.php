<?php

use App\Enums\BookingProvider;
use App\Models\Restaurant;
use App\Services\Availability\AvailabilityManager;
use App\Services\Availability\NowBookItProvider;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    Http::preventStrayRequests();
    $this->venue = Restaurant::factory()->make([
        'id' => 7,
        'booking_provider' => BookingProvider::NowBookIt,
        'booking_venue_id' => '11136',
        'booking_url' => 'https://bookings.nowbookit.com/?accountid=abc&venueid=11136',
    ]);
    $this->date = CarbonImmutable::parse('2026-11-28');
});

function nowBookItAnswer(): array
{
    return json_decode(file_get_contents(base_path('tests/Fixtures/nowbookit-schedule.json')), true);
}

test('it asks the schedule endpoint for the venue, date and party', function () {
    Http::fake(['api.nowbookit.com/*' => Http::response(nowBookItAnswer())]);

    (new NowBookItProvider)->getSlots($this->venue, $this->date, 8);

    Http::assertSent(fn ($request) => str_starts_with($request->url(), 'https://api.nowbookit.com/bookings/get-schedule/venue/11136?')
        && $request['date'] === '2026-11-28'
        && (int) $request['numofpeople'] === 8);
});

test('only times the booking page offers count', function () {
    Http::fake(['api.nowbookit.com/*' => Http::response(nowBookItAnswer())]);

    expect((new NowBookItProvider)->getSlots($this->venue, $this->date, 8))
        ->toBe(['available' => true, 'slots' => ['17:30', '17:45'], 'error' => null]);
});

test('services not offered online are skipped', function () {
    $answer = nowBookItAnswer();
    $answer['services'][0]['online'] = false;
    Http::fake(['api.nowbookit.com/*' => Http::response($answer)]);

    expect((new NowBookItProvider)->getSlots($this->venue, $this->date, 8)['slots'])->toBe([]);
});

test('a closed day with no services is "nothing free", not an error', function () {
    Http::fake(['api.nowbookit.com/*' => Http::response(['isVenueOpen' => true, 'services' => []])]);

    expect((new NowBookItProvider)->getSlots($this->venue, $this->date, 2))
        ->toBe(['available' => false, 'slots' => [], 'error' => null]);
});

test('an answer in another shape is unknown', function () {
    Http::fake(['api.nowbookit.com/*' => Http::response(['message' => 'Venue not found'])]);

    expect((new NowBookItProvider)->getSlots($this->venue, $this->date, 2)['error'])->toBe('unexpected_response');
});

test('the manager uses it, and Book opens their saved link as is', function () {
    Http::fake(['api.nowbookit.com/*' => Http::response(nowBookItAnswer())]);
    $manager = app(AvailabilityManager::class);

    expect($manager->provider(BookingProvider::NowBookIt))->toBeInstanceOf(NowBookItProvider::class)
        ->and($manager->getSlots($this->venue, $this->date, 8)['slots'])->toBe(['17:30', '17:45'])
        ->and($manager->bookingLink($this->venue, $this->date, '17:30', 8))
        ->toBe('https://bookings.nowbookit.com/?accountid=abc&venueid=11136');
});
