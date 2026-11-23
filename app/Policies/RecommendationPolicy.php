<?php

namespace App\Policies;

use App\Models\Recommendation;
use App\Models\User;

class RecommendationPolicy
{
    public function view(User $user, Recommendation $recommendation): bool
    {
        return $user->id === $recommendation->from_user_id
            || $user->id === $recommendation->to_user_id;
    }

    /** Only friends can receive a recommendation inside the app. */
    public function send(User $user, User $recipient): bool
    {
        return $user->isFriendsWith($recipient);
    }

    /** Save to wishlist: only the recipient. */
    public function save(User $user, Recommendation $recommendation): bool
    {
        return $user->id === $recommendation->to_user_id;
    }

    public function delete(User $user, Recommendation $recommendation): bool
    {
        return $this->view($user, $recommendation);
    }
}
