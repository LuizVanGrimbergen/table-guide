<?php

namespace App\Http\Controllers;

use App\Enums\EntryStatus;
use App\Http\Requests\SendRecommendationRequest;
use App\Models\Recommendation;
use App\Models\Restaurant;
use App\Models\SavedEntry;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\View\View;

class RecommendationController extends Controller
{
    /** Send to friends in the app, and/or make a public link. */
    public function store(SendRecommendationRequest $request, Restaurant $restaurant): RedirectResponse
    {
        $user = $request->user();
        $data = $request->validated();
        $sent = 0;

        foreach (User::whereIn('id', $data['to'] ?? [])->get() as $friend) {
            $this->authorize('send', [Recommendation::class, $friend]);

            Recommendation::create([
                'from_user_id' => $user->id,
                'to_user_id' => $friend->id,
                'restaurant_id' => $restaurant->id,
                'message' => $data['message'] ?? null,
            ]);
            $sent++;
        }

        if ($request->boolean('public')) {
            $rec = Recommendation::create([
                'from_user_id' => $user->id,
                'restaurant_id' => $restaurant->id,
                'message' => $data['message'] ?? null,
                'public_token' => Str::random(32),
            ]);

            return back()->with('shareUrl', route('recommendations.public', $rec->public_token));
        }

        return back()->with('toast', $sent === 1 ? 'Recommendation sent' : "Sent to {$sent} friends");
    }

    /** Recipient saves it to their wishlist. */
    public function save(Request $request, Recommendation $recommendation): RedirectResponse
    {
        $this->authorize('save', $recommendation);
        $user = $request->user();

        SavedEntry::firstOrCreate(
            ['user_id' => $user->id, 'restaurant_id' => $recommendation->restaurant_id],
            [
                'status' => EntryStatus::Wish,
                'recommended_by' => $recommendation->sender->name,
                'note' => $recommendation->message,
                'visibility' => $user->default_visibility,
            ],
        );

        $recommendation->update(['saved_at' => now()]);

        return back()->with('toast', "{$recommendation->restaurant->name} saved to your wishlist");
    }

    /** Public page for people without an account. Blade, so link previews work. */
    public function public(Request $request, string $token): View
    {
        $rec = Recommendation::with(['restaurant.menuLinks', 'sender'])
            ->where('public_token', $token)
            ->firstOrFail();

        $entry = SavedEntry::where('user_id', $rec->from_user_id)
            ->where('restaurant_id', $rec->restaurant_id)
            ->first();

        return view('recommendation', [
            'rec' => $rec,
            'restaurant' => $rec->restaurant,
            'sender' => $rec->sender,
            // He chose to share this place, so his rating travels with it. His note never does.
            'rating' => $entry?->rating,
            'viewer' => $request->user(),
        ]);
    }

    /** "Save to my wishlist" from the public page, for signed-in visitors. */
    public function savePublic(Request $request, string $token): RedirectResponse
    {
        $rec = Recommendation::with(['restaurant', 'sender'])->where('public_token', $token)->firstOrFail();
        $user = $request->user();

        SavedEntry::firstOrCreate(
            ['user_id' => $user->id, 'restaurant_id' => $rec->restaurant_id],
            [
                'status' => EntryStatus::Wish,
                'recommended_by' => $rec->sender->name,
                'note' => $rec->message,
                'visibility' => $user->default_visibility,
            ],
        );

        return redirect()->route('restaurants.show', $rec->restaurant_id)
            ->with('toast', "{$rec->restaurant->name} saved to your wishlist");
    }
}
