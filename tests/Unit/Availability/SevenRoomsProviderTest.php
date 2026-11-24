<?php

use App\Enums\BookingProvider;
use App\Models\Restaurant;
use App\Services\Availability\SevenRoomsProvider;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

uses(TestCase::class);

const SEVENROOMS = 'https://www.sevenrooms.com/api-yoa/availability/ng/widget/range*';

beforeEach(function () {
    Http::preventStrayRequests();
    $this->bistecca = Restaurant::factory()->make([
        'id' => 16,
        'booking_provider' => BookingProvider::SevenRooms,
        'booking_venue_id' => 'bistecca',
    ]);
    $this->date = CarbonImmutable::parse('2026-11-25');
});

function sevenRoomsAnswer(): array
{
    return json_decode(file_get_contents(base_path('tests/Fixtures/sevenrooms-range.json')), true);
}

test('it asks the widget endpoint the way the booking page does', function () {
    Http::fake([SEVENROOMS => Http::response(sevenRoomsAnswer())]);

    (new SevenRoomsProvider)->getSlots($this->bistecca, $this->date, 4);

    Http::assertSent(fn ($request) => str_starts_with($request->url(), 'https://www.sevenrooms.com/api-yoa/availability/ng/widget/range?')
        && $request['venue'] === 'bistecca'
        && (int) $request['party_size'] === 4
        && $request['start_date'] === '2026-11-25'
        && (int) $request['num_days'] === 1
        && $request['channel'] === 'SEVENROOMS_WIDGET');
});

test('only bookable times count, not times you can only request', function () {
    Http::fake([SEVENROOMS => Http::response(sevenRoomsAnswer())]);

    expect((new SevenRoomsProvider)->getSlots($this->bistecca, $this->date, 4))
        ->toBe(['available' => true, 'slots' => ['12:00', '14:30'], 'error' => null]);
});

test('a day with only request times is a real "nothing free", not an error', function () {
    $answer = sevenRoomsAnswer();
    foreach ($answer['data']['availability']['2026-11-25'] as &$shift) {
        foreach ($shift['times'] as &$slot) {
            $slot['type'] = 'request';
        }
    }
    Http::fake([SEVENROOMS => Http::response($answer)]);

    expect((new SevenRoomsProvider)->getSlots($this->bistecca, $this->date, 2))
        ->toBe(['available' => false, 'slots' => [], 'error' => null]);
});

test('closed shifts are skipped', function () {
    $answer = sevenRoomsAnswer();
    $answer['data']['availability']['2026-11-25'][0]['is_closed'] = true;
    Http::fake([SEVENROOMS => Http::response($answer)]);

    expect((new SevenRoomsProvider)->getSlots($this->bistecca, $this->date, 4)['slots'])->toBe([]);
});

test('an answer in another shape is unknown, never full', function (array $answer) {
    Http::fake([SEVENROOMS => Http::response($answer)]);

    expect((new SevenRoomsProvider)->getSlots($this->bistecca, $this->date, 2)['error'])->toBe('unexpected_response');
})->with([
    'no data' => [['status' => 400, 'msg' => 'Invalid venue']],
    'times not a list' => [['data' => ['availability' => ['2026-11-25' => [['times' => 'none']]]]]],
]);
