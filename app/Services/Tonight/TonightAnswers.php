<?php

namespace App\Services\Tonight;

/**
 * What he told the "Help me choose" questions.
 */
final readonly class TonightAnswers
{
    public const array COMPANY = ['clients', 'friends', 'partner', 'family'];

    public const array MOOD = ['sure', 'new', 'special', 'relaxed', 'drinks'];

    public function __construct(
        public string $city,
        public int $guests = 2,
        public ?string $cuisine = null,
        public ?string $company = null,
        public ?string $mood = null,
        public ?string $wish = null,
    ) {}

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'city' => $this->city,
            'guests' => $this->guests,
            'cuisine' => $this->cuisine ?? 'no preference',
            'company' => $this->company ?? 'not said',
            'mood' => $this->mood ?? 'not said',
            'extra_wish' => $this->wish ?? '',
        ];
    }
}
