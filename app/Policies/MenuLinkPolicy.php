<?php

namespace App\Policies;

use App\Models\MenuLink;
use App\Models\User;

class MenuLinkPolicy
{
    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, MenuLink $link): bool
    {
        return $link->added_by === $user->id;
    }

    public function delete(User $user, MenuLink $link): bool
    {
        return $link->added_by === $user->id;
    }
}
