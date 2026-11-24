<?php

use App\Enums\BookingProvider;
use App\Models\Restaurant;
use App\Models\SavedEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->restaurant = Restaurant::factory()->create();
    $this->entry = SavedEntry::factory()->for($this->user)->for($this->restaurant)->create();
});

test('a new restaurant has no booking platform set', function () {
    expect(Restaurant::factory()->create()->refresh()->booking_provider)->toBe(BookingProvider::None);
});

test('someone who keeps the place can save its booking details', function () {
    $this->actingAs($this->user)
        ->patch("/restaurants/{$this->restaurant->id}/booking", [
            'booking_provider' => 'sevenrooms',
            'booking_venue_id' => '  fratellifresh  ',
            'booking_url' => 'https://www.sevenrooms.com/reservations/fratellifresh',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $r = $this->restaurant->refresh();
    expect($r->booking_provider)->toBe(BookingProvider::SevenRooms)
        ->and($r->booking_venue_id)->toBe('fratellifresh')
        ->and($r->booking_url)->toBe('https://www.sevenrooms.com/reservations/fratellifresh');
});

test('someone without the place cannot change its booking details', function () {
    $this->actingAs(User::factory()->create())
        ->patch("/restaurants/{$this->restaurant->id}/booking", ['booking_provider' => 'phone'])
        ->assertForbidden();

    expect($this->restaurant->refresh()->booking_provider)->toBe(BookingProvider::None);
});

test('booking details are validated', function () {
    $this->actingAs($this->user)
        ->patch("/restaurants/{$this->restaurant->id}/booking", [
            'booking_provider' => 'thefork',
            'booking_url' => 'javascript:alert(1)',
        ])
        ->assertSessionHasErrors(['booking_provider', 'booking_url']);
});

test('the table checker switch is personal and only the owner can flip it', function () {
    $this->actingAs($this->user)
        ->patch("/entries/{$this->entry->id}", ['in_checker' => true])
        ->assertRedirect();

    expect($this->entry->refresh()->in_checker)->toBeTrue();

    $this->actingAs(User::factory()->create())
        ->patch("/entries/{$this->entry->id}", ['in_checker' => false])
        ->assertForbidden();

    expect($this->entry->refresh()->in_checker)->toBeTrue();
});

test('the restaurant page carries the booking details and the checker switch', function () {
    $this->restaurant->update(['booking_provider' => BookingProvider::OpenTable, 'booking_venue_id' => '123']);

    $this->actingAs($this->user)
        ->get("/restaurants/{$this->restaurant->id}")
        ->assertInertia(fn ($page) => $page
            ->where('restaurant.bookingProvider', 'opentable')
            ->where('restaurant.bookingVenueId', '123')
            ->where('entry.inChecker', false));
});
