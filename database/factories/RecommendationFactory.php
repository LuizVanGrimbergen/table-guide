<?php

namespace Database\Factories;

use App\Models\Recommendation;
use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Recommendation>
 */
class RecommendationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'from_user_id' => User::factory(),
            'to_user_id' => User::factory(),
            'restaurant_id' => Restaurant::factory(),
            'message' => fake()->sentence(),
        ];
    }
}
