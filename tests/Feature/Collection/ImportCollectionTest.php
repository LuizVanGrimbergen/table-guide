<?php

use App\Enums\EntryStatus;
use App\Enums\Occasion;
use App\Enums\Visibility;
use App\Models\Restaurant;
use App\Models\SavedEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function writeRows(array $rows): string
{
    $path = tempnam(sys_get_temp_dir(), 'tc').'.json';
    file_put_contents($path, json_encode($rows));

    return $path;
}

$rows = [
    ['name' => 'Fratelli Paradiso', 'city' => 'Sydney', 'area' => 'Potts Point', 'occasion' => 'business_lunch', 'cuisine' => 'Italian', 'good_for' => ['clients'], 'status' => 'been', 'favourite' => true, 'not_recommended' => false, 'note' => 'Best pasta', 'website' => null],
    ['name' => 'Glenmore', 'city' => 'Sydney', 'area' => 'The Rocks', 'occasion' => 'bars', 'cuisine' => 'Pub', 'good_for' => [], 'status' => 'been', 'favourite' => false, 'not_recommended' => true, 'note' => 'Stay away from food', 'website' => null],
    ['name' => 'Somewhere New', 'city' => 'Ghent', 'area' => '', 'occasion' => 'casual', 'cuisine' => null, 'good_for' => [], 'status' => 'wish', 'favourite' => false, 'not_recommended' => false, 'note' => '', 'website' => 'https://example.com'],
];

test('it imports restaurants and saved entries for the user', function () use ($rows) {
    $user = User::factory()->create(['email' => 'godfather@example.com']);

    $this->artisan('collection:import', ['file' => writeRows($rows), 'email' => 'godfather@example.com'])
        ->assertSuccessful();

    expect(Restaurant::count())->toBe(3)
        ->and($user->savedEntries()->count())->toBe(3);

    $fratelli = Restaurant::where('name', 'Fratelli Paradiso')->first();
    expect($fratelli->country)->toBe('Australia')
        ->and($fratelli->occasion)->toBe(Occasion::BusinessLunch)
        ->and($fratelli->cuisine)->toBe('Italian');

    $entry = $user->savedEntries()->where('restaurant_id', $fratelli->id)->first();
    expect($entry->status)->toBe(EntryStatus::Been)
        ->and($entry->favourite)->toBeTrue()
        ->and($entry->note)->toBe('Best pasta')
        ->and($entry->good_for)->toBe(['clients'])
        ->and($entry->visibility)->toBe(Visibility::Private);

    $new = Restaurant::where('name', 'Somewhere New')->first();
    expect($new->area)->toBeNull()
        ->and($new->country)->toBe('Belgium')
        ->and($new->savedEntries->first()->status)->toBe(EntryStatus::Wish)
        ->and($new->savedEntries->first()->note)->toBeNull();

    expect(SavedEntry::where('not_recommended', true)->count())->toBe(1);
});

test('running the import twice never overwrites his edits', function () use ($rows) {
    $user = User::factory()->create(['email' => 'godfather@example.com']);
    $file = writeRows($rows);

    $this->artisan('collection:import', ['file' => $file, 'email' => $user->email])->assertSuccessful();

    $entry = $user->savedEntries()->first();
    $entry->update(['note' => 'My own updated note', 'rating' => 5]);

    $this->artisan('collection:import', ['file' => $file, 'email' => $user->email])->assertSuccessful();

    expect(Restaurant::count())->toBe(3)
        ->and($user->savedEntries()->count())->toBe(3)
        ->and($entry->fresh()->note)->toBe('My own updated note')
        ->and($entry->fresh()->rating)->toBe(5);
});

test('a second user shares restaurants but keeps independent entries', function () use ($rows) {
    $a = User::factory()->create();
    $b = User::factory()->create();
    $file = writeRows($rows);

    $this->artisan('collection:import', ['file' => $file, 'email' => $a->email])->assertSuccessful();
    $this->artisan('collection:import', ['file' => $file, 'email' => $b->email])->assertSuccessful();

    expect(Restaurant::count())->toBe(3)
        ->and(SavedEntry::count())->toBe(6);
});

test('it refuses an unknown user unless asked to create one', function () use ($rows) {
    $file = writeRows($rows);

    $this->artisan('collection:import', ['file' => $file, 'email' => 'nobody@example.com'])->assertFailed();
    expect(Restaurant::count())->toBe(0);

    $this->artisan('collection:import', ['file' => $file, 'email' => 'nobody@example.com', '--create-user' => true, '--name' => 'Nobody'])
        ->assertSuccessful();
    expect(User::where('email', 'nobody@example.com')->first()->savedEntries()->count())->toBe(3);
});

test('the real list imports cleanly', function () {
    if (! is_file(base_path('data/restaurants.json'))) {
        $this->markTestSkipped('His private list is not in git; it only exists on machines that have it.');
    }

    $user = User::factory()->create();

    $this->artisan('collection:import', ['file' => 'data/restaurants.json', 'email' => $user->email])->assertSuccessful();

    expect($user->savedEntries()->count())->toBe(184)
        ->and($user->savedEntries()->wishlist()->count())->toBe(18)
        ->and($user->savedEntries()->where('favourite', true)->count())->toBe(23);
});
