<?php

namespace Database\Factories;

use App\Enums\EntryStatus;
use App\Enums\Visibility;
use App\Models\Restaurant;
use App\Models\SavedEntry;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SavedEntry>
 */
class SavedEntryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'restaurant_id' => Restaurant::factory(),
            'status' => EntryStatus::Been,
            'visibility' => Visibility::Private,
            'note' => fake()->sentence(),
            'good_for' => [],
        ];
    }

    public function wishlist(): static
    {
        return $this->state(fn () => ['status' => EntryStatus::Wish]);
    }

    public function visibility(Visibility $visibility): static
    {
        return $this->state(fn () => ['visibility' => $visibility]);
    }
}
