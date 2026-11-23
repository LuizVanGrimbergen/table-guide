<?php

namespace App\Models;

use App\Enums\MenuLinkKind;
use App\Enums\MenuLinkSource;
use Carbon\CarbonImmutable;
use Database\Factories\MenuLinkFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A verified or user-supplied link to a restaurant's own menu. We never
 * generate menu content ourselves.
 *
 * @property int $id
 * @property int $restaurant_id
 * @property int|null $added_by
 * @property MenuLinkKind $kind
 * @property string $url
 * @property MenuLinkSource $source
 * @property CarbonImmutable|null $checked_at
 * @property bool $maybe_stale
 */
#[Fillable(['restaurant_id', 'added_by', 'kind', 'url', 'source', 'checked_at', 'maybe_stale'])]
class MenuLink extends Model
{
    /** @use HasFactory<MenuLinkFactory> */
    use HasFactory;

    protected $attributes = [
        'kind' => 'food',
        'source' => 'user',
        'maybe_stale' => false,
    ];

    protected function casts(): array
    {
        return [
            'kind' => MenuLinkKind::class,
            'source' => MenuLinkSource::class,
            'checked_at' => 'datetime',
            'maybe_stale' => 'boolean',
        ];
    }

    /** @return BelongsTo<Restaurant, $this> */
    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }

    /** @return BelongsTo<User, $this> */
    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by');
    }
}
