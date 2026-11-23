<?php

namespace Database\Factories;

use App\Enums\FriendshipStatus;
use App\Models\Friendship;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Friendship>
 */
class FriendshipFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'friend_id' => User::factory(),
            'status' => FriendshipStatus::Accepted,
        ];
    }

    public function pendingInvite(): static
    {
        return $this->state(fn () => [
            'friend_id' => null,
            'status' => FriendshipStatus::Pending,
            'invite_token' => Str::random(40),
        ]);
    }
}
