<?php

namespace App\Services\Tonight;

use Anthropic\Beta\Messages\BetaTextBlock;
use Anthropic\Client;
use App\Enums\Occasion;
use RuntimeException;

/**
 * Asks Claude to pick tonight's places from his own shortlist and explain
 * why, using only what he wrote. Runs on the server; the key never
 * reaches the browser.
 */
class ClaudeDinnerAi implements DinnerAi
{
    private const string SYSTEM = <<<'PROMPT'
        You are the dinner concierge inside The Collection, a private restaurant guide that belongs to one person. He keeps his own list of restaurants with his own notes, ratings and tags. Tonight he answered a few quick questions, and you help him decide where to go.

        You receive his answers and a shortlist of his own saved places, already pre-scored by simple rules. Choose the best one to three places for tonight and explain each choice to him.

        How to choose:
        - Weigh his answers (cuisine, who is coming, what kind of night, number of guests, any extra wish) against each place's tags, occasion, status, rating and his note. The pre-score is a hint, not a ruling: use judgement, especially for his extra wish.
        - Prefer variety: if two places are near-identical choices, pick the stronger one and use the other slot for a genuinely different option.
        - If his note warns against something relevant (for example "stay away from food" when he wants dinner), do not pick it.
        - Fewer, better picks beat filler. One great match is fine.

        How to explain:
        - Write to him directly ("you", "your"), warm and brief, like a friend who knows his taste.
        - Ground every reason in the data you were given: his note, his rating, favourite or wishlist status, who recommended it, its tags, area or occasion. Quoting a few words of his note is good.
        - Never invent dishes, menus, prices, opening hours, availability or facts that are not in the data. Do not claim a table is free or booked.
        - headline: at most 8 words. why: one or two sentences, at most 40 words.
        - intro: one short sentence that sums up the evening he asked for.

        Use only ids from the shortlist.
        PROMPT;

    public function __construct(private readonly ?string $apiKey, private readonly string $model) {}

    public function isAvailable(): bool
    {
        return filled($this->apiKey);
    }

    public function choose(TonightAnswers $answers, array $shortlist): array
    {
        $client = new Client(apiKey: $this->apiKey);

        $message = $client->beta->messages->create(
            model: $this->model,
            maxTokens: 16000,
            system: self::SYSTEM,
            messages: [['role' => 'user', 'content' => $this->prompt($answers, $shortlist)]],
            outputConfig: [
                'effort' => 'low',
                'format' => ['type' => 'json_schema', 'schema' => self::schema()],
            ],
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            requestOptions: ['timeout' => 45.0, 'maxRetries' => 1],
        );

        if ($message->stopReason === 'refusal') {
            throw new RuntimeException('Claude declined the request');
        }

        foreach ($message->content as $block) {
            if ($block instanceof BetaTextBlock) {
                $data = json_decode($block->text, true, flags: JSON_THROW_ON_ERROR);

                return [
                    'intro' => (string) ($data['intro'] ?? ''),
                    'picks' => array_values(array_map(fn (array $p) => [
                        'id' => (int) $p['id'],
                        'headline' => (string) $p['headline'],
                        'why' => (string) $p['why'],
                    ], $data['picks'] ?? [])),
                ];
            }
        }

        throw new RuntimeException('Claude returned no text');
    }

    /** @param list<array<string, mixed>> $shortlist */
    private function prompt(TonightAnswers $answers, array $shortlist): string
    {
        $places = array_map(fn (array $p) => array_filter([
            'id' => $p['id'],
            'name' => $p['name'],
            'area' => $p['area'],
            'cuisine' => $p['cuisine'],
            'occasion' => $p['occasion'] ? Occasion::from($p['occasion'])->name : null,
            'good_for' => $p['goodFor'] ?: null,
            'status' => $p['status'] === 'wish' ? 'wishlist (not been yet)' : 'been there',
            'favourite' => $p['favourite'] ?: null,
            'his_rating' => $p['rating'],
            'his_note' => $p['note'],
            'recommended_by' => $p['recommendedBy'],
            'pre_score' => $p['score'],
        ], fn ($v) => $v !== null && $v !== ''), $shortlist);

        return 'Today is '.now()->timezone(config("collection.cities.{$answers->city}.timezone", 'UTC'))->format('l j F, H:i').".\n\n"
            ."His answers:\n".json_encode($answers->toArray(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)."\n\n"
            ."Shortlist of his places:\n".json_encode($places, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }

    /** @return array<string, mixed> */
    private static function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'intro' => ['type' => 'string'],
                'picks' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'properties' => [
                            'id' => ['type' => 'integer'],
                            'headline' => ['type' => 'string'],
                            'why' => ['type' => 'string'],
                        ],
                        'required' => ['id', 'headline', 'why'],
                        'additionalProperties' => false,
                    ],
                ],
            ],
            'required' => ['intro', 'picks'],
            'additionalProperties' => false,
        ];
    }
}
