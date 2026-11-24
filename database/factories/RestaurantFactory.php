<?php

namespace Database\Factories;

use App\Enums\BookingProvider;
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

    /** Takes bookings online through $provider, under venue id $venueId. */
    public function bookable(BookingProvider $provider = BookingProvider::SevenRooms, ?string $venueId = null): static
    {
        return $this->state(fn () => [
            'booking_provider' => $provider,
            'booking_venue_id' => $venueId ?? fake()->unique()->slug(2),
            'booking_url' => 'https://example.com/book/'.fake()->slug(2),
        ]);
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
