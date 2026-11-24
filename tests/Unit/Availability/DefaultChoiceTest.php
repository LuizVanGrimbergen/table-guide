<?php

use App\Http\Controllers\AvailabilityController;
use Carbon\CarbonImmutable;

test('the checker starts at a sensible time', function (string $now, string $date, string $time) {
    $choice = AvailabilityController::defaultChoice(CarbonImmutable::parse("2026-11-24 {$now}", 'Australia/Sydney'));

    expect($choice)->toBe(['date' => $date, 'time' => $time, 'party' => 2]);
})->with([
    'morning: tonight at seven' => ['09:10', '2026-11-24', '19:00'],
    'just before seven' => ['18:20', '2026-11-24', '19:00'],
    'evening: half an hour on, next quarter' => ['19:05', '2026-11-24', '19:45'],
    'on the quarter' => ['20:15', '2026-11-24', '20:45'],
    'late: tomorrow at seven' => ['22:05', '2026-11-25', '19:00'],
]);
