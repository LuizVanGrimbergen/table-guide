<?php

namespace Database\Factories;

use App\Enums\Occasion;
use App\Models\Restaurant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Restaurant>
 */
class RestaurantFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->company(),
            'city' => 'Sydney',
            'area' => fake()->randomElement(['Surry Hills', 'CBD', 'Darlinghurst', 'Newtown', 'Paddington']),
            'country' => 'Australia',
            'cuisine' => fake()->randomElement(['Italian', 'Japanese', 'French', null]),
            'occasion' => fake()->randomElement(Occasion::values()),
        ];
    }

    public function geocoded(): static
    {
        return $this->state(fn () => [
            'lat' => fake()->latitude(-33.95, -33.80),
            'lng' => fake()->longitude(151.15, 151.28),
            'google_place_id' => 'ChIJ'.fake()->unique()->bothify('??????????????????????'),
            'geocoded_at' => now(),
        ]);
    }
}
