<?php

use App\Enums\EntryStatus;
use App\Models\MenuLink;
use App\Models\Restaurant;
use App\Models\SavedEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->other = User::factory()->create();
});

test('the main screens only send the signed-in user\'s own collection', function (string $url, string $component) {
    SavedEntry::factory()->for($this->user)->for(Restaurant::factory()->create(['name' => 'Mine', 'city' => 'Sydney']))->create(['note' => 'My note']);
    SavedEntry::factory()->for($this->other)->for(Restaurant::factory()->create(['name' => 'Theirs']))->create(['note' => 'Secret']);

    $this->actingAs($this->user)
        ->get($url)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component($component)
            ->has('places', 1)
            ->where('places.0.name', 'Mine')
            ->where('places.0.note', 'My note')
            ->where('homeCity', 'Sydney'));
})->with([
    ['/', 'home'],
    ['/collection', 'collection'],
    ['/map', 'map'],
    ['/tonight', 'tonight'],
]);

test('collection passes the initial filters from the URL', function () {
    $this->actingAs($this->user)
        ->get('/collection?occ=bars&hideAvoid=1&evil=1')
        ->assertInertia(fn (Assert $page) => $page
            ->where('initial', ['occ' => 'bars', 'hideAvoid' => '1']));
});

test('the detail page shows his entry and the restaurant facts', function () {
    $entry = SavedEntry::factory()->for($this->user)->create(['note' => 'Order the gnocchi']);
    MenuLink::factory()->for($entry->restaurant)->create(['added_by' => $this->other->id]);

    $this->actingAs($this->user)
        ->get("/restaurants/{$entry->restaurant_id}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('restaurant')
            ->where('entry.note', 'Order the gnocchi')
            ->has('restaurant.menuLinks', 1)
            ->where('restaurant.menuLinks.0.canDelete', false));
});

test('he can update his own entry, and rating marks it been there', function () {
    $entry = SavedEntry::factory()->for($this->user)->wishlist()->create();

    $this->actingAs($this->user)
        ->patch("/entries/{$entry->id}", ['rating' => 4, 'favourite' => true, 'note' => 'Lovely'])
        ->assertRedirect();

    $entry->refresh();
    expect($entry->rating)->toBe(4)
        ->and($entry->status)->toBe(EntryStatus::Been)
        ->and($entry->favourite)->toBeTrue()
        ->and($entry->note)->toBe('Lovely');
});

test('nobody else can change or delete his entry', function () {
    $entry = SavedEntry::factory()->for($this->user)->create(['note' => 'Mine']);

    $this->actingAs($this->other)->patch("/entries/{$entry->id}", ['note' => 'Hacked'])->assertForbidden();
    $this->actingAs($this->other)->delete("/entries/{$entry->id}")->assertForbidden();

    expect($entry->fresh()->note)->toBe('Mine');
});

test('ratings must be 1 to 5', function () {
    $entry = SavedEntry::factory()->for($this->user)->create();

    $this->actingAs($this->user)->patch("/entries/{$entry->id}", ['rating' => 9])->assertSessionHasErrors('rating');
});

test('adding a restaurant reuses a shared one and never duplicates his entry', function () {
    $shared = Restaurant::factory()->create(['name' => 'Fratelli', 'city' => 'Sydney']);

    $this->actingAs($this->user)
        ->post('/restaurants', ['name' => ' Fratelli ', 'city' => 'Sydney', 'status' => 'wish', 'note' => 'Luiz says go'])
        ->assertRedirect("/restaurants/{$shared->id}");

    $this->actingAs($this->user)
        ->post('/restaurants', ['name' => 'Fratelli', 'city' => 'Sydney', 'status' => 'been'])
        ->assertRedirect();

    expect(Restaurant::count())->toBe(1)
        ->and($this->user->savedEntries()->count())->toBe(1)
        ->and($this->user->savedEntries()->first()->note)->toBe('Luiz says go');
});

test('a new restaurant gets its country from the city', function () {
    $this->actingAs($this->user)
        ->post('/restaurants', ['name' => 'New Place', 'city' => 'Ghent', 'area' => '', 'status' => 'wish'])
        ->assertRedirect();

    $r = Restaurant::firstWhere('name', 'New Place');
    expect($r->country)->toBe('Belgium')->and($r->area)->toBeNull();
});

test('menu links must be real web addresses and only the person who added one can remove it', function () {
    $restaurant = Restaurant::factory()->create();

    $this->actingAs($this->user)
        ->post("/restaurants/{$restaurant->id}/menu-links", ['url' => 'not a url', 'kind' => 'food'])
        ->assertSessionHasErrors('url');

    $this->actingAs($this->user)
        ->post("/restaurants/{$restaurant->id}/menu-links", ['url' => 'https://example.com/menu.pdf', 'kind' => 'wine'])
        ->assertRedirect();

    $link = $restaurant->menuLinks()->first();
    expect($link->source->value)->toBe('user')->and($link->added_by)->toBe($this->user->id);

    $this->actingAs($this->other)->delete("/menu-links/{$link->id}")->assertForbidden();
    $this->actingAs($this->user)->delete("/menu-links/{$link->id}")->assertRedirect();
    expect(MenuLink::count())->toBe(0);
});

test('saving someone else\'s restaurant puts it on his wishlist', function () {
    $restaurant = Restaurant::factory()->create();

    $this->actingAs($this->user)->post("/restaurants/{$restaurant->id}/save")->assertRedirect();

    expect($this->user->savedEntries()->first()->status)->toBe(EntryStatus::Wish);
});
