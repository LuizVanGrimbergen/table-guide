<?php

namespace App\Policies;

use App\Models\Restaurant;
use App\Models\User;

/**
 * Restaurants hold shared facts. Anyone signed in can look them up;
 * manual corrections are open to users who keep the place in their
 * collection. Nobody deletes a shared restaurant from the app.
 */
class RestaurantPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Restaurant $restaurant): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Restaurant $restaurant): bool
    {
        return $restaurant->savedEntries()->where('user_id', $user->id)->exists();
    }

    public function delete(User $user, Restaurant $restaurant): bool
    {
        return false;
    }
}
