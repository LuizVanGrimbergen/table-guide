<?php

namespace Database\Factories;

use App\Enums\MenuLinkKind;
use App\Enums\MenuLinkSource;
use App\Models\MenuLink;
use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MenuLink>
 */
class MenuLinkFactory extends Factory
{
    public function definition(): array
    {
        return [
            'restaurant_id' => Restaurant::factory(),
            'added_by' => User::factory(),
            'kind' => MenuLinkKind::Food,
            'url' => fake()->url(),
            'source' => MenuLinkSource::User,
        ];
    }
}
