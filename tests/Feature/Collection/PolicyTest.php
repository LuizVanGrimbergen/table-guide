<?php

use App\Enums\Visibility;
use App\Models\Friendship;
use App\Models\MenuLink;
use App\Models\Recommendation;
use App\Models\Restaurant;
use App\Models\SavedEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->owner = User::factory()->create();
    $this->friend = User::factory()->create();
    $this->stranger = User::factory()->create();
    Friendship::factory()->create(['user_id' => $this->owner->id, 'friend_id' => $this->friend->id]);
});

test('only the owner can edit or delete a saved entry', function () {
    $entry = SavedEntry::factory()->for($this->owner)->visibility(Visibility::Public)->create();

    expect($this->owner->can('update', $entry))->toBeTrue()
        ->and($this->owner->can('delete', $entry))->toBeTrue()
        ->and($this->friend->can('update', $entry))->toBeFalse()
        ->and($this->stranger->can('delete', $entry))->toBeFalse();
});

test('private entries are visible to the owner only', function () {
    $entry = SavedEntry::factory()->for($this->owner)->visibility(Visibility::Private)->create();

    expect($this->owner->can('view', $entry))->toBeTrue()
        ->and($this->friend->can('view', $entry))->toBeFalse()
        ->and($this->stranger->can('view', $entry))->toBeFalse();
});

test('friends-only entries are visible to accepted friends in both directions', function () {
    $entry = SavedEntry::factory()->for($this->friend)->visibility(Visibility::Friends)->create();

    expect($this->owner->can('view', $entry))->toBeTrue()
        ->and($this->stranger->can('view', $entry))->toBeFalse();
});

test('a pending invite does not make people friends', function () {
    $pending = User::factory()->create();
    Friendship::factory()->create(['user_id' => $this->owner->id, 'friend_id' => $pending->id, 'status' => 'pending']);
    $entry = SavedEntry::factory()->for($this->owner)->visibility(Visibility::Friends)->create();

    expect($pending->can('view', $entry))->toBeFalse();
});

test('public entries are visible to everyone, including guests', function () {
    $entry = SavedEntry::factory()->for($this->owner)->visibility(Visibility::Public)->create();

    expect($this->stranger->can('view', $entry))->toBeTrue()
        ->and($entry->isVisibleTo(null))->toBeTrue();
});

test('restaurant facts can be corrected only by people who saved it, and never deleted', function () {
    $restaurant = Restaurant::factory()->create();
    SavedEntry::factory()->for($this->owner)->for($restaurant)->create();

    expect($this->owner->can('update', $restaurant))->toBeTrue()
        ->and($this->stranger->can('update', $restaurant))->toBeFalse()
        ->and($this->owner->can('delete', $restaurant))->toBeFalse();
});

test('menu links can be changed only by whoever added them', function () {
    $link = MenuLink::factory()->create(['added_by' => $this->owner->id]);

    expect($this->owner->can('update', $link))->toBeTrue()
        ->and($this->friend->can('delete', $link))->toBeFalse();
});

test('recommendations: friends only, recipient saves', function () {
    $rec = Recommendation::factory()->create(['from_user_id' => $this->owner->id, 'to_user_id' => $this->friend->id]);

    expect($this->owner->can('send', [Recommendation::class, $this->friend]))->toBeTrue()
        ->and($this->owner->can('send', [Recommendation::class, $this->stranger]))->toBeFalse()
        ->and($this->friend->can('view', $rec))->toBeTrue()
        ->and($this->stranger->can('view', $rec))->toBeFalse()
        ->and($this->friend->can('save', $rec))->toBeTrue()
        ->and($this->owner->can('save', $rec))->toBeFalse();
});

test('an invite link can be accepted by someone else, once', function () {
    $invite = Friendship::factory()->pendingInvite()->create(['user_id' => $this->owner->id]);

    expect($this->stranger->can('accept', $invite))->toBeTrue()
        ->and($this->owner->can('accept', $invite))->toBeFalse();

    $invite->update(['friend_id' => $this->stranger->id, 'status' => 'accepted']);

    expect($this->friend->can('accept', $invite->fresh()))->toBeFalse();
});
