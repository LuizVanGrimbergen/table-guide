<?php

namespace App\Policies;

use App\Models\SavedEntry;
use App\Models\User;

/**
 * A collection is only ever edited by its owner. Others see an entry
 * only when its visibility allows.
 */
class SavedEntryPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(?User $user, SavedEntry $entry): bool
    {
        return $entry->isVisibleTo($user);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, SavedEntry $entry): bool
    {
        return $user->id === $entry->user_id;
    }

    public function delete(User $user, SavedEntry $entry): bool
    {
        return $user->id === $entry->user_id;
    }
}
