<?php

namespace App\Models;

use App\Enums\FriendshipStatus;
use Database\Factories\FriendshipFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Created by user_id as an invite. friend_id is filled in when the
 * invite link is accepted.
 *
 * @property int $id
 * @property int $user_id
 * @property int|null $friend_id
 * @property FriendshipStatus $status
 * @property string|null $invite_token
 */
#[Fillable(['user_id', 'friend_id', 'status', 'invite_token'])]
class Friendship extends Model
{
    /** @use HasFactory<FriendshipFactory> */
    use HasFactory;

    protected $attributes = [
        'status' => 'pending',
    ];

    protected function casts(): array
    {
        return [
            'status' => FriendshipStatus::class,
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<User, $this> */
    public function friend(): BelongsTo
    {
        return $this->belongsTo(User::class, 'friend_id');
    }

    public function involves(User $user): bool
    {
        return $this->user_id === $user->id || $this->friend_id === $user->id;
    }
}
