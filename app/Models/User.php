<?php

namespace App\Models;

use App\Enums\FriendshipStatus;
use App\Enums\Visibility;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property list<string>|null $taste_tags
 * @property Visibility $default_visibility
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password', 'taste_tags', 'default_visibility'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail, PasskeyUser
{
    protected $attributes = [
        'default_visibility' => 'private',
    ];

    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'taste_tags' => 'array',
            'default_visibility' => Visibility::class,
        ];
    }

    /** @return HasMany<SavedEntry, $this> */
    public function savedEntries(): HasMany
    {
        return $this->hasMany(SavedEntry::class);
    }

    /** @return HasMany<Recommendation, $this> */
    public function sentRecommendations(): HasMany
    {
        return $this->hasMany(Recommendation::class, 'from_user_id');
    }

    /** @return HasMany<Recommendation, $this> */
    public function receivedRecommendations(): HasMany
    {
        return $this->hasMany(Recommendation::class, 'to_user_id');
    }

    /**
     * Ids of everyone with an accepted friendship, in either direction.
     *
     * @return array<int, int>
     */
    public function friendIds(): array
    {
        return Friendship::query()
            ->where('status', FriendshipStatus::Accepted)
            ->where(fn ($q) => $q->where('user_id', $this->id)->orWhere('friend_id', $this->id))
            ->get(['user_id', 'friend_id'])
            ->map(fn (Friendship $f) => $f->user_id === $this->id ? $f->friend_id : $f->user_id)
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    /**
     * Restaurants already in his collection.
     *
     * @return array<int, int>
     */
    public function savedRestaurantIds(): array
    {
        return $this->savedEntries()->pluck('restaurant_id')->map(fn ($id) => (int) $id)->values()->all();
    }

    public function isFriendsWith(?User $other): bool
    {
        if ($other === null || $other->id === $this->id) {
            return false;
        }

        return Friendship::query()
            ->where('status', FriendshipStatus::Accepted)
            ->where(fn ($q) => $q
                ->where(fn ($q) => $q->where('user_id', $this->id)->where('friend_id', $other->id))
                ->orWhere(fn ($q) => $q->where('user_id', $other->id)->where('friend_id', $this->id)))
            ->exists();
    }
}
