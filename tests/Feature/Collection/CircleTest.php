<?php

use App\Enums\EntryStatus;
use App\Enums\FriendshipStatus;
use App\Enums\Visibility;
use App\Models\Friendship;
use App\Models\Recommendation;
use App\Models\Restaurant;
use App\Models\SavedEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->godfather = User::factory()->create(['name' => 'Godfather']);
    $this->luiz = User::factory()->create(['name' => 'Luiz', 'taste_tags' => ['Italian', 'Pizza']]);
});

function befriend(User $a, User $b): Friendship
{
    return Friendship::factory()->create(['user_id' => $a->id, 'friend_id' => $b->id]);
}

test('invite link: create, accept once, and both see each other', function () {
    $this->actingAs($this->godfather)->post('/friends/invite')->assertRedirect();
    $this->actingAs($this->godfather)->post('/friends/invite');

    expect(Friendship::count())->toBe(1);
    $token = Friendship::first()->invite_token;

    $this->actingAs($this->luiz)->get("/invite/{$token}")
        ->assertInertia(fn (Assert $p) => $p->component('invite')->where('from', 'Godfather'));

    $this->actingAs($this->luiz)->post("/invite/{$token}/accept")->assertRedirect('/friends');

    expect($this->godfather->isFriendsWith($this->luiz))->toBeTrue()
        ->and(Friendship::first()->invite_token)->toBeNull();

    // The used link is dead for anyone else.
    $other = User::factory()->create();
    $this->actingAs($other)->get("/invite/{$token}")->assertRedirect('/friends');
    $this->actingAs($other)->post("/invite/{$token}/accept")->assertNotFound();
});

test('guests opening an invite are sent to log in first', function () {
    $invite = Friendship::factory()->pendingInvite()->create(['user_id' => $this->godfather->id]);

    $this->get("/invite/{$invite->invite_token}")->assertRedirect('/login');
});

test('you cannot accept your own invite', function () {
    $invite = Friendship::factory()->pendingInvite()->create(['user_id' => $this->godfather->id]);

    $this->actingAs($this->godfather)->post("/invite/{$invite->invite_token}/accept")->assertForbidden();
});

test('recommendations go to friends only', function () {
    $restaurant = Restaurant::factory()->create(['name' => 'Fratelli']);
    $stranger = User::factory()->create();
    befriend($this->godfather, $this->luiz);

    $this->actingAs($this->godfather)
        ->post("/restaurants/{$restaurant->id}/recommend", ['to' => [$this->luiz->id], 'message' => 'You love pizza'])
        ->assertRedirect();

    $this->actingAs($this->godfather)
        ->post("/restaurants/{$restaurant->id}/recommend", ['to' => [$stranger->id]])
        ->assertForbidden();

    expect(Recommendation::count())->toBe(1)
        ->and($this->luiz->receivedRecommendations()->first()->message)->toBe('You love pizza');
});

test('the recipient saves a recommendation to their wishlist', function () {
    befriend($this->godfather, $this->luiz);
    $rec = Recommendation::factory()->create(['from_user_id' => $this->godfather->id, 'to_user_id' => $this->luiz->id, 'message' => 'Try the gnocchi']);

    $this->actingAs($this->godfather)->post("/recommendations/{$rec->id}/save")->assertForbidden();
    $this->actingAs($this->luiz)->post("/recommendations/{$rec->id}/save")->assertRedirect();

    $entry = $this->luiz->savedEntries()->first();
    expect($entry->status)->toBe(EntryStatus::Wish)
        ->and($entry->recommended_by)->toBe('Godfather')
        ->and($entry->note)->toBe('Try the gnocchi')
        ->and($rec->fresh()->saved_at)->not->toBeNull();
});

test('the public page shows the recommendation and his rating, never his private note', function () {
    $restaurant = Restaurant::factory()->create(['name' => 'Fratelli', 'area' => 'Potts Point']);
    SavedEntry::factory()->for($this->godfather)->for($restaurant)->create(['rating' => 5, 'note' => 'SECRET NOTE']);

    $this->actingAs($this->godfather)
        ->post("/restaurants/{$restaurant->id}/recommend", ['public' => true, 'message' => 'Go on a Tuesday'])
        ->assertSessionHas('shareUrl');

    $token = Recommendation::first()->public_token;
    auth()->logout();

    $this->get("/r/{$token}")
        ->assertOk()
        ->assertSee('Fratelli')
        ->assertSee('Recommended by Godfather')
        ->assertSee('Go on a Tuesday')
        ->assertSee('property="og:title"', false)
        ->assertSee('5 out of 5 stars', false)
        ->assertDontSee('SECRET NOTE');

    $this->get('/r/not-a-token')->assertNotFound();
});

test('a signed-in visitor can save a public recommendation', function () {
    $rec = Recommendation::factory()->create(['from_user_id' => $this->godfather->id, 'to_user_id' => null, 'public_token' => 'tok123']);

    $this->actingAs($this->luiz)->post('/r/tok123/save')->assertRedirect("/restaurants/{$rec->restaurant_id}");

    expect($this->luiz->savedEntries()->count())->toBe(1);
});

test('My Circle shows friends\' shared favourites but never private ones or notes', function () {
    befriend($this->godfather, $this->luiz);
    SavedEntry::factory()->for($this->luiz)->for(Restaurant::factory()->create(['name' => 'Shared Fav']))
        ->create(['favourite' => true, 'visibility' => Visibility::Friends, 'note' => 'LUIZ NOTE']);
    SavedEntry::factory()->for($this->luiz)->for(Restaurant::factory()->create(['name' => 'Private Fav']))
        ->create(['favourite' => true, 'visibility' => Visibility::Private]);

    $response = $this->actingAs($this->godfather)->get('/friends');

    $response->assertInertia(fn (Assert $p) => $p
        ->component('friends')
        ->has('friends', 1)
        ->where('friends.0.tasteTags', ['Italian', 'Pizza'])
        ->has('favourites', 1)
        ->where('favourites.0.name', 'Shared Fav'));
    expect($response->getContent())->not->toContain('LUIZ NOTE');
});

test('changing who sees ratings applies to all his entries', function () {
    SavedEntry::factory()->count(3)->for($this->godfather)->create();

    $this->actingAs($this->godfather)
        ->patch('/sharing', ['visibility' => 'friends', 'taste_tags' => [' Italian ', 'Wine', 'Wine']])
        ->assertRedirect();

    $this->godfather->refresh();
    expect($this->godfather->default_visibility)->toBe(Visibility::Friends)
        ->and($this->godfather->taste_tags)->toBe(['Italian', 'Wine'])
        ->and($this->godfather->savedEntries()->where('visibility', 'friends')->count())->toBe(3);
});

test('removing a friend ends the friendship for both', function () {
    $friendship = befriend($this->godfather, $this->luiz);

    $this->actingAs(User::factory()->create())->delete("/friendships/{$friendship->id}")->assertForbidden();
    $this->actingAs($this->luiz)->delete("/friendships/{$friendship->id}")->assertRedirect();

    expect($this->godfather->isFriendsWith($this->luiz))->toBeFalse();
});

test('the restaurant page lists friends for the Recommend sheet', function () {
    befriend($this->luiz, $this->godfather);
    $restaurant = Restaurant::factory()->create();

    $this->actingAs($this->godfather)->get("/restaurants/{$restaurant->id}")
        ->assertInertia(fn (Assert $p) => $p->where('friends.0.name', 'Luiz'));
});

test('home shows recommendations received', function () {
    Recommendation::factory()->create(['to_user_id' => $this->godfather->id, 'message' => 'Hello']);

    $this->actingAs($this->godfather)->get('/')
        ->assertInertia(fn (Assert $p) => $p->has('received', 1)->where('received.0.message', 'Hello'));
});

test('friendship status pending is not friends', function () {
    Friendship::factory()->create(['user_id' => $this->godfather->id, 'friend_id' => $this->luiz->id, 'status' => FriendshipStatus::Pending]);

    expect($this->godfather->friendIds())->toBe([]);
});
