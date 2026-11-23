<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\RecommendationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A restaurant sent from one user to a friend (to_user_id) or shared
 * through a public link (public_token).
 *
 * @property int $id
 * @property int $from_user_id
 * @property int|null $to_user_id
 * @property string|null $public_token
 * @property int $restaurant_id
 * @property string|null $message
 * @property CarbonImmutable|null $saved_at
 */
#[Fillable(['from_user_id', 'to_user_id', 'public_token', 'restaurant_id', 'message', 'saved_at'])]
class Recommendation extends Model
{
    /** @use HasFactory<RecommendationFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'saved_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'from_user_id');
    }

    /** @return BelongsTo<User, $this> */
    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'to_user_id');
    }

    /** @return BelongsTo<Restaurant, $this> */
    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }
}
