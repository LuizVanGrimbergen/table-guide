<?php

namespace App\Policies;

use App\Enums\FriendshipStatus;
use App\Models\Friendship;
use App\Models\User;

class FriendshipPolicy
{
    /** Accept an open invite link created by someone else. */
    public function accept(User $user, Friendship $friendship): bool
    {
        return $friendship->status === FriendshipStatus::Pending
            && $friendship->user_id !== $user->id
            && ($friendship->friend_id === null || $friendship->friend_id === $user->id);
    }

    public function delete(User $user, Friendship $friendship): bool
    {
        return $friendship->involves($user);
    }
}
