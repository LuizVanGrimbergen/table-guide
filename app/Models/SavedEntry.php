<?php

namespace App\Models;

use App\Enums\EntryStatus;
use App\Enums\Visibility;
use Carbon\CarbonImmutable;
use Database\Factories\SavedEntryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One user's personal entry for a restaurant: status, rating, note.
 *
 * @property int $id
 * @property int $user_id
 * @property int $restaurant_id
 * @property EntryStatus $status
 * @property bool $favourite
 * @property bool $not_recommended
 * @property bool $in_checker
 * @property int|null $rating
 * @property string|null $note
 * @property string|null $recommended_by
 * @property CarbonImmutable|null $visited_on
 * @property Visibility $visibility
 * @property list<string>|null $good_for
 */
#[Fillable([
    'user_id', 'restaurant_id', 'status', 'favourite', 'not_recommended', 'in_checker', 'rating',
    'note', 'recommended_by', 'visited_on', 'visibility', 'good_for',
])]
class SavedEntry extends Model
{
    /** @use HasFactory<SavedEntryFactory> */
    use HasFactory;

    protected $attributes = [
        'status' => 'wish',
        'visibility' => 'private',
        'favourite' => false,
        'not_recommended' => false,
        'in_checker' => false,
    ];

    protected function casts(): array
    {
        return [
            'status' => EntryStatus::class,
            'visibility' => Visibility::class,
            'favourite' => 'boolean',
            'not_recommended' => 'boolean',
            'in_checker' => 'boolean',
            'rating' => 'integer',
            'visited_on' => 'date',
            'good_for' => 'array',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Restaurant, $this> */
    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }

    /**
     * Whether $viewer may see this entry under its visibility setting.
     */
    public function isVisibleTo(?User $viewer): bool
    {
        if ($viewer?->id === $this->user_id) {
            return true;
        }

        return match ($this->visibility) {
            Visibility::Public => true,
            Visibility::Friends => $viewer !== null && $viewer->isFriendsWith($this->user),
            Visibility::Private => false,
        };
    }

    /** @param Builder<SavedEntry> $query */
    public function scopeBeen(Builder $query): void
    {
        $query->where('status', EntryStatus::Been);
    }

    /** @param Builder<SavedEntry> $query */
    public function scopeWishlist(Builder $query): void
    {
        $query->where('status', EntryStatus::Wish);
    }
}
