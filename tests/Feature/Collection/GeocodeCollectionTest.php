<?php

use App\Actions\GeocodeRestaurant;
use App\Enums\VerifyStatus;
use App\Models\Restaurant;
use App\Models\SavedEntry;
use App\Services\GooglePlaces;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    config([
        'services.google.places_server_key' => 'test-key',
        'collection.geocode.throttle_ms' => 0,
    ]);
    app()->forgetInstance(GooglePlaces::class);
});

function place(string $id, string $name, float $lat = -33.87, float $lng = 151.21, string $status = 'OPERATIONAL'): array
{
    return ['places' => [[
        'id' => $id,
        'displayName' => ['text' => $name],
        'location' => ['latitude' => $lat, 'longitude' => $lng],
        'formattedAddress' => '1 Test St, Sydney NSW 2000, Australia',
        'addressComponents' => [['longText' => 'Surry Hills', 'types' => ['locality', 'political']]],
        'businessStatus' => $status,
    ]]];
}

test('a confident match stores place id and location without touching saved entries', function () {
    $restaurant = Restaurant::factory()->create(['name' => 'Fratelli Paradiso', 'area' => null]);
    $entry = SavedEntry::factory()->for($restaurant)->create(['note' => 'Keep me', 'rating' => 4]);
    $before = $entry->fresh()->toArray();

    Http::fake(['places.googleapis.com/*' => Http::response(place('abc', 'Fratelli Paradiso'))]);

    $this->artisan('collection:geocode')->assertSuccessful();

    $restaurant->refresh();
    expect($restaurant->google_place_id)->toBe('abc')
        ->and($restaurant->lat)->toBe(-33.87)
        ->and($restaurant->area)->toBe('Surry Hills')
        ->and($restaurant->verify_status)->toBeNull()
        ->and($restaurant->geocoded_at)->not->toBeNull()
        ->and($entry->fresh()->toArray())->toBe($before);

    Http::assertSent(fn ($request) => $request->hasHeader('X-Goog-Api-Key', 'test-key')
        && str_contains($request->header('X-Goog-FieldMask')[0], 'places.id')
        && $request['maxResultCount'] === 1
        && str_contains($request['textQuery'], 'Fratelli Paradiso'));
});

test('uncertain matches are flagged needs_review', function (array $response, ?VerifyStatus $expected) {
    $restaurant = Restaurant::factory()->create(['name' => 'Fratelli Paradiso', 'area' => 'Potts Point']);
    Http::fake(['places.googleapis.com/*' => Http::response($response)]);

    $this->artisan('collection:geocode')->assertSuccessful();

    expect($restaurant->fresh()->verify_status)->toBe($expected);
})->with([
    'different name' => [place('x1', 'Totally Other Diner'), VerifyStatus::NeedsReview],
    'far from the city' => [place('x2', 'Fratelli Paradiso', -37.81, 144.96), VerifyStatus::NeedsReview],
    'no result' => [[], VerifyStatus::NeedsReview],
    'address in another suburb' => [place('x4', 'Fratelli Paradiso'), VerifyStatus::NeedsReview],
    'permanently closed' => [place('x3', 'Fratelli Paradiso', status: 'CLOSED_PERMANENTLY'), VerifyStatus::PossiblyClosed],
]);

test('a match in the suburb he wrote, or in the CBD, is not flagged', function (string $area) {
    $restaurant = Restaurant::factory()->create(['name' => 'Fratelli Paradiso', 'area' => $area]);
    $response = place('ok', 'Fratelli Paradiso');
    $response['places'][0]['formattedAddress'] = '12 Challis Ave, Potts Point NSW 2011, Australia';
    Http::fake(['places.googleapis.com/*' => Http::response($response)]);

    $this->artisan('collection:geocode')->assertSuccessful();

    expect($restaurant->fresh()->verify_status)->toBeNull();
})->with(['Potts Point', 'CBD']);

test('two entries resolving to the same place are flagged, not merged', function () {
    Restaurant::factory()->create(['name' => 'Glenmore', 'google_place_id' => 'same', 'geocoded_at' => now()]);
    $dupe = Restaurant::factory()->create(['name' => 'The Glenmore Hotel']);
    Http::fake(['places.googleapis.com/*' => Http::response(place('same', 'Glenmore'))]);

    $this->artisan('collection:geocode')->assertSuccessful();

    expect($dupe->fresh()->google_place_id)->toBeNull()
        ->and($dupe->fresh()->verify_status)->toBe(VerifyStatus::NeedsReview);
});

test('it is resumable: an API error stops the run and the next run continues', function () {
    $first = Restaurant::factory()->create(['name' => 'Alpha']);
    $second = Restaurant::factory()->create(['name' => 'Beta']);

    $apiDown = true;
    Http::fake(function ($request) use (&$apiDown) {
        if (str_contains($request['textQuery'], 'Alpha')) {
            return Http::response(place('a', 'Alpha'));
        }

        return $apiDown
            ? Http::response(['error' => ['message' => 'denied']], 403)
            : Http::response(place('b', 'Beta'));
    });

    $this->artisan('collection:geocode')->assertFailed();

    expect($first->fresh()->google_place_id)->toBe('a')
        ->and($second->fresh()->geocoded_at)->toBeNull();

    $apiDown = false;
    $this->artisan('collection:geocode')->assertSuccessful();

    expect($second->fresh()->google_place_id)->toBe('b');
    // Alpha was not looked up again.
    Http::assertSentCount(3);
});

test('--limit stops early', function () {
    Restaurant::factory()->count(3)->sequence(['name' => 'A'], ['name' => 'B'], ['name' => 'C'])->create();
    Http::fake(['places.googleapis.com/*' => Http::response([])]);

    $this->artisan('collection:geocode', ['--limit' => 2])->assertSuccessful();

    expect(Restaurant::whereNotNull('geocoded_at')->count())->toBe(2);
});

test('it refuses to run without a server key', function () {
    config(['services.google.places_server_key' => null]);
    app()->forgetInstance(GooglePlaces::class);

    $this->artisan('collection:geocode')->assertFailed();
});

test('name similarity ignores case, accents and filler words', function () {
    expect(GeocodeRestaurant::nameSimilarity('The Doss House', 'Doss House'))->toBe(100)
        ->and(GeocodeRestaurant::nameSimilarity('Café Sydney', 'Cafe Sydney Restaurant'))->toBe(100)
        ->and(GeocodeRestaurant::nameSimilarity('Glenmore', 'Totally Different'))->toBeLessThan(60);
});
