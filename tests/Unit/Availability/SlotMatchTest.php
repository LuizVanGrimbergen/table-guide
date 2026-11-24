<?php

use App\Enums\AvailabilityStatus;
use App\Services\Availability\SlotMatch;
use App\Services\Availability\SlotResult;

function slots(string ...$times): array
{
    return SlotResult::found($times);
}

test('the requested time is free', function () {
    $match = SlotMatch::for(slots('18:30', '19:00', '19:30'), '19:00');

    expect($match['status'])->toBe(AvailabilityStatus::Available)
        ->and($match['requested'])->toBe('19:00')
        ->and($match['nearest'])->toBe(['18:30', '19:30']);
});

// From 19:00: 17:15 is 105 min away (out), 17:45 75, 18:00 60, 19:45 45, 20:30 90, 21:00 120 (out).
test('other times within 90 minutes, the three closest, in time order', function () {
    $match = SlotMatch::for(slots('17:15', '17:45', '18:00', '19:45', '20:30', '21:00'), '19:00');

    expect($match['status'])->toBe(AvailabilityStatus::Alternative)
        ->and($match['requested'])->toBeNull()
        ->and($match['nearest'])->toBe(['17:45', '18:00', '19:45']);
});

test('a tie goes to the earlier time', function () {
    expect(SlotMatch::for(slots('18:30', '19:30', '20:00'), '19:00')['nearest'])
        ->toBe(['18:30', '19:30', '20:00']);

    expect(SlotMatch::for(slots('18:00', '20:00'), '19:00')['nearest'])
        ->toBe(['18:00', '20:00']);
});

test('exactly 90 minutes away still counts, 91 does not', function () {
    expect(SlotMatch::for(slots('20:30'), '19:00')['status'])->toBe(AvailabilityStatus::Alternative)
        ->and(SlotMatch::for(slots('20:31'), '19:00')['status'])->toBe(AvailabilityStatus::Full);
});

test('full when nothing is free nearby, even with times later in the day', function () {
    expect(SlotMatch::for(slots('12:00', '22:00'), '19:00'))
        ->toBe(['status' => AvailabilityStatus::Full, 'requested' => null, 'nearest' => []])
        ->and(SlotMatch::for(slots(), '19:00')['status'])->toBe(AvailabilityStatus::Full);
});

test('any error is unknown, never full', function () {
    expect(SlotMatch::for(SlotResult::failed('unreachable'), '19:00'))
        ->toBe(['status' => AvailabilityStatus::Unknown, 'requested' => null, 'nearest' => []]);
});
