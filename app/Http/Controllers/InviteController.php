<?php

namespace App\Http\Controllers;

use App\Enums\FriendshipStatus;
use App\Models\Friendship;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/** Someone opens an invite link. Guests sign in or register first. */
class InviteController extends Controller
{
    public function show(Request $request, string $token): Response|RedirectResponse
    {
        $invite = Friendship::with('user')->where('invite_token', $token)->first();
        $user = $request->user();

        if (! $invite || $invite->status !== FriendshipStatus::Pending) {
            return redirect()->route('friends')->with('toast', 'This invite link has already been used');
        }

        if ($invite->user_id === $user->id) {
            return redirect()->route('friends')->with('toast', 'This is your own invite link. Send it to a friend');
        }

        return Inertia::render('invite', [
            'token' => $token,
            'from' => $invite->user->name,
            'alreadyFriends' => $user->isFriendsWith($invite->user),
        ]);
    }

    public function accept(Request $request, string $token): RedirectResponse
    {
        $invite = Friendship::where('invite_token', $token)->firstOrFail();
        $user = $request->user();

        if ($user->isFriendsWith($invite->user)) {
            return redirect()->route('friends');
        }

        $this->authorize('accept', $invite);

        DB::transaction(function () use ($invite, $user) {
            // A reverse invite he sent earlier becomes redundant.
            Friendship::where('user_id', $user->id)->where('friend_id', $invite->user_id)->delete();

            $invite->update([
                'friend_id' => $user->id,
                'status' => FriendshipStatus::Accepted,
                'invite_token' => null,
            ]);
        });

        return redirect()->route('friends')->with('toast', "You and {$invite->user->name} are now in each other's circle");
    }
}
