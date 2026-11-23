<?php

use App\Models\Restaurant;
use App\Models\User;
use App\Services\GooglePlaces;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

function usePlacesKey(?string $key): void
{
    config(['services.google.places_server_key' => $key]);
    app()->forgetInstance(GooglePlaces::class);
}

test('without a key, search says it is unavailable and never calls Google', function () {
    usePlacesKey(null);
    Http::fake();

    $this->actingAs(User::factory()->create())
        ->getJson('/places/search?q=fratelli&city=Sydney')
        ->assertOk()
        ->assertJson(['available' => false, 'results' => []]);

    Http::assertNothingSent();
});

test('search returns tidy results with suburb as area and his city', function () {
    usePlacesKey('k');
    Http::fake(['places.googleapis.com/*' => Http::response(['places' => [[
        'id' => 'pid1',
        'displayName' => ['text' => 'Fratelli Paradiso'],
        'formattedAddress' => '12 Challis Ave, Potts Point NSW 2011, Australia',
        'location' => ['latitude' => -33.87, 'longitude' => 151.22],
        'addressComponents' => [['longText' => 'Potts Point', 'types' => ['locality']]],
    ]]])]);

    $this->actingAs(User::factory()->create())
        ->getJson('/places/search?q=fratelli&city=Sydney')
        ->assertOk()
        ->assertJsonPath('results.0.placeId', 'pid1')
        ->assertJsonPath('results.0.city', 'Sydney')
        ->assertJsonPath('results.0.area', 'Potts Point');

    Http::assertSent(fn ($r) => $r['maxResultCount'] === 5 && str_contains($r['textQuery'], 'fratelli Sydney'));
});

test('short queries are rejected before any Google call', function () {
    usePlacesKey('k');
    Http::fake();

    $this->actingAs(User::factory()->create())->getJson('/places/search?q=ab')->assertUnprocessable();
    Http::assertNothingSent();
});

test('adding from Google stores the place and reuses it by place id', function () {
    $user = User::factory()->create();
    $existing = Restaurant::factory()->create(['name' => 'Old Name', 'google_place_id' => 'pid1']);

    $this->actingAs($user)->post('/restaurants', [
        'name' => 'Fratelli Paradiso', 'city' => 'Sydney', 'status' => 'wish',
        'google_place_id' => 'pid1', 'lat' => -33.87, 'lng' => 151.22, 'address' => '12 Challis Ave',
    ])->assertRedirect("/restaurants/{$existing->id}");

    expect(Restaurant::count())->toBe(1);

    $this->actingAs($user)->post('/restaurants', [
        'name' => 'New One', 'city' => 'Sydney', 'status' => 'been',
        'google_place_id' => 'pid2', 'lat' => -33.88, 'lng' => 151.21, 'address' => '1 George St',
    ]);

    $new = Restaurant::firstWhere('google_place_id', 'pid2');
    expect($new->lat)->toBe(-33.88)->and($new->address)->toBe('1 George St')->and($new->geocoded_at)->not->toBeNull();
});
