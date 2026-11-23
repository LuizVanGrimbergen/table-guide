<?php

namespace App\Http\Controllers;

use App\Enums\FriendshipStatus;
use App\Enums\Visibility;
use App\Http\Requests\UpdateSharingRequest;
use App\Models\Friendship;
use App\Models\Recommendation;
use App\Models\SavedEntry;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * My Circle: friends, invites by link, recommendations received, and
 * what friends chose to share. Private notes are never sent here.
 */
class FriendsController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $friendIds = $user->friendIds();
        $friends = User::whereIn('id', $friendIds)->orderBy('name')->get();

        /** @var array<int, int> $friendshipIdByFriend */
        $friendshipIdByFriend = [];
        $accepted = Friendship::query()
            ->where('status', FriendshipStatus::Accepted)
            ->where(fn ($q) => $q->where('user_id', $user->id)->orWhere('friend_id', $user->id))
            ->get();

        foreach ($accepted as $f) {
            $other = $f->user_id === $user->id ? $f->friend_id : $f->user_id;

            if ($other !== null) {
                $friendshipIdByFriend[$other] = $f->id;
            }
        }

        // Restaurants he already has, so "Save to wishlist" can show "Saved".
        $mine = $user->savedRestaurantIds();

        $favourites = SavedEntry::query()
            ->with(['restaurant', 'user'])
            ->whereIn('user_id', $friendIds)
            ->where('favourite', true)
            ->whereIn('visibility', [Visibility::Friends, Visibility::Public])
            ->latest('updated_at')
            ->limit(30)
            ->get()
            ->map(fn (SavedEntry $e) => [
                'id' => $e->id,
                'restaurantId' => $e->restaurant_id,
                'name' => $e->restaurant->name,
                'area' => $e->restaurant->area,
                'city' => $e->restaurant->city,
                'cuisine' => $e->restaurant->cuisine,
                'friend' => $e->user->name,
                'rating' => $e->rating,
                'saved' => in_array($e->restaurant_id, $mine, true),
            ]);

        return Inertia::render('friends', [
            'friends' => $friends->map(fn (User $f) => [
                'id' => $f->id,
                'name' => $f->name,
                'tasteTags' => $f->taste_tags ?? [],
                'friendshipId' => $friendshipIdByFriend[$f->id] ?? null,
            ]),
            'invites' => Friendship::query()
                ->where('user_id', $user->id)
                ->where('status', FriendshipStatus::Pending)
                ->whereNotNull('invite_token')
                ->latest()
                ->get()
                ->map(fn (Friendship $f) => [
                    'id' => $f->id,
                    'url' => route('invites.show', $f->invite_token),
                    'createdAt' => $f->created_at?->toIso8601String(),
                ]),
            'received' => self::received($user, $mine),
            'favourites' => $favourites,
            'me' => [
                'tasteTags' => $user->taste_tags ?? [],
                'visibility' => $user->default_visibility->value,
            ],
        ]);
    }

    /**
     * Recommendations sent to $user, newest first, unsaved ones on top.
     *
     * @param  array<int, int>  $mine
     * @return array<int, array<string, mixed>>
     */
    public static function received(User $user, array $mine, int $limit = 30): array
    {
        return $user->receivedRecommendations()
            ->with(['restaurant', 'sender'])
            ->orderByRaw('saved_at is not null')
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn (Recommendation $r) => [
                'id' => $r->id,
                'restaurantId' => $r->restaurant_id,
                'name' => $r->restaurant->name,
                'area' => $r->restaurant->area,
                'city' => $r->restaurant->city,
                'cuisine' => $r->restaurant->cuisine,
                'from' => $r->sender->name,
                'message' => $r->message,
                'sentAt' => $r->created_at?->toIso8601String(),
                'saved' => $r->saved_at !== null || in_array($r->restaurant_id, $mine, true),
            ])
            ->values()
            ->all();
    }

    /** Create (or reuse) an open invite link. */
    public function invite(Request $request): RedirectResponse
    {
        $user = $request->user();

        $open = Friendship::query()
            ->where('user_id', $user->id)
            ->where('status', FriendshipStatus::Pending)
            ->whereNull('friend_id')
            ->whereNotNull('invite_token')
            ->first();

        $open ??= Friendship::create([
            'user_id' => $user->id,
            'status' => FriendshipStatus::Pending,
            'invite_token' => Str::random(40),
        ]);

        return back()->with('toast', 'Invite link ready to share');
    }

    public function destroy(Request $request, Friendship $friendship): RedirectResponse
    {
        $this->authorize('delete', $friendship);
        $friendship->delete();

        return back()->with('toast', $friendship->status === FriendshipStatus::Pending ? 'Invite link cancelled' : 'Removed from your circle');
    }

    /** Taste tags and who can see his ratings. Applies to all his entries. */
    public function updateSharing(UpdateSharingRequest $request): RedirectResponse
    {
        $user = $request->user();
        $data = $request->validated();

        if (array_key_exists('taste_tags', $data)) {
            $user->taste_tags = array_values(array_unique(array_filter(array_map('trim', $data['taste_tags'] ?? []))));
        }

        if (isset($data['visibility'])) {
            $user->default_visibility = Visibility::from($data['visibility']);
            $user->savedEntries()->update(['visibility' => $data['visibility']]);
        }

        $user->save();

        return back()->with('toast', 'Saved');
    }
}
