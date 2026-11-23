<?php

namespace App\Models;

use App\Enums\Occasion;
use App\Enums\VerifyStatus;
use Carbon\CarbonImmutable;
use Database\Factories\RestaurantFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Shared facts about a place. Never holds ratings or notes: those are
 * personal and live on SavedEntry.
 *
 * @property int $id
 * @property string $name
 * @property string $city
 * @property string|null $area
 * @property string|null $country
 * @property string|null $address
 * @property float|null $lat
 * @property float|null $lng
 * @property string|null $google_place_id
 * @property string|null $website
 * @property string|null $phone
 * @property int|null $price_level
 * @property string|null $cuisine
 * @property Occasion|null $occasion
 * @property VerifyStatus|null $verify_status
 * @property CarbonImmutable|null $verified_at
 * @property CarbonImmutable|null $geocoded_at
 */
#[Fillable([
    'name', 'city', 'area', 'country', 'address', 'lat', 'lng', 'google_place_id',
    'website', 'phone', 'price_level', 'cuisine', 'occasion', 'verify_status',
    'verified_at', 'geocoded_at',
])]
class Restaurant extends Model
{
    /** @use HasFactory<RestaurantFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'lat' => 'float',
            'lng' => 'float',
            'price_level' => 'integer',
            'occasion' => Occasion::class,
            'verify_status' => VerifyStatus::class,
            'verified_at' => 'datetime',
            'geocoded_at' => 'datetime',
        ];
    }

    /** @return HasMany<SavedEntry, $this> */
    public function savedEntries(): HasMany
    {
        return $this->hasMany(SavedEntry::class);
    }

    /** @return HasMany<MenuLink, $this> */
    public function menuLinks(): HasMany
    {
        return $this->hasMany(MenuLink::class);
    }

    /** @return HasMany<Recommendation, $this> */
    public function recommendations(): HasMany
    {
        return $this->hasMany(Recommendation::class);
    }
}
