<?php

namespace App\Services\Tonight;

use App\Enums\EntryStatus;
use App\Enums\Occasion;
use App\Enums\VerifyStatus;
use App\Models\SavedEntry;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * "Help me choose": scores his own places against three answers and
 * explains every pick from his own data. When Claude is configured it
 * gets the shortlist and makes the final choice; any failure falls back
 * to the rules, so the feature always answers.
 */
class TonightAdvisor
{
    private const int SHORTLIST = 20;

    public function __construct(private readonly ?DinnerAi $ai = null) {}

    /**
     * @return array{source: 'ai'|'rules', intro: string, picks: list<array<string, mixed>>}
     */
    public function suggest(User $user, TonightAnswers $answers): array
    {
        $shortlist = $this->shortlist($user, $answers);

        if ($shortlist === []) {
            return [
                'source' => 'rules',
                'intro' => "Nothing in your {$answers->city} collection fits yet. Try fewer wishes.",
                'picks' => [],
            ];
        }

        if ($this->ai?->isAvailable()) {
            try {
                $choice = $this->ai->choose($answers, $shortlist);
                $byId = collect($shortlist)->keyBy('id');
                $picks = [];

                foreach ($choice['picks'] as $pick) {
                    // Only places from his own shortlist, never anything invented.
                    $place = $byId->get($pick['id']);
                    if ($place !== null && ! in_array($pick['id'], array_column($picks, 'id'), true)) {
                        $picks[] = [...$place, 'headline' => $pick['headline'], 'why' => $pick['why']];
                    }
                }

                if ($picks !== []) {
                    return ['source' => 'ai', 'intro' => $choice['intro'], 'picks' => array_slice($picks, 0, 3)];
                }
            } catch (Throwable $e) {
                Log::warning('Tonight AI suggestion failed, using rules', ['error' => $e->getMessage()]);
            }
        }

        return [
            'source' => 'rules',
            'intro' => $this->rulesIntro($answers),
            'picks' => array_map(fn (array $p) => [
                ...$p,
                'headline' => $p['reasons'][0] ?? 'One of your places',
                'why' => implode('. ', array_slice($p['reasons'], 0, 3)).'.',
            ], array_slice($shortlist, 0, 3)),
        ];
    }

    /**
     * His places in the city, best match first, each with the reasons it scored.
     *
     * @return list<array<string, mixed>>
     */
    public function shortlist(User $user, TonightAnswers $answers): array
    {
        $entries = $user->savedEntries()
            ->with('restaurant')
            ->whereHas('restaurant', fn ($q) => $q->where('city', $answers->city))
            ->where('not_recommended', false)
            ->get()
            ->reject(fn (SavedEntry $e) => in_array($e->restaurant->verify_status, [VerifyStatus::PossiblyClosed, VerifyStatus::Closed], true));

        $scored = $entries->map(function (SavedEntry $e) use ($answers) {
            [$score, $reasons] = $this->score($e, $answers);

            return ['score' => $score, 'reasons' => $reasons, 'entry' => $e];
        })
            ->sort(fn (array $x, array $y) => $y['score'] <=> $x['score']
                ?: strcmp($x['entry']->restaurant->name, $y['entry']->restaurant->name))
            ->take(self::SHORTLIST)
            ->values();

        return array_values($scored->map(fn (array $s) => self::present($s['entry'], $s['score'], $s['reasons']))->all());
    }

    /** @return array{0: float, 1: list<string>} */
    public function score(SavedEntry $e, TonightAnswers $a): array
    {
        $r = $e->restaurant;
        $good = $e->good_for ?? [];
        $occasion = $r->occasion;
        $been = $e->status === EntryStatus::Been;
        $score = 0.0;
        $reasons = [];
        $add = function (float $points, ?string $reason = null) use (&$score, &$reasons): void {
            $score += $points;
            if ($reason !== null) {
                $reasons[] = $reason;
            }
        };

        // What he already knows he loves.
        if ($e->favourite) {
            $add(4, 'One of your favourites');
        }
        if ($e->rating) {
            $add($e->rating * 0.6, $e->rating >= 4 ? "You rated it {$e->rating} stars" : null);
        }
        if ($e->note) {
            $add(0.5);
        }

        // Cuisine: his tag first, then his note or the name.
        if ($a->cuisine) {
            $wanted = mb_strtolower($a->cuisine);
            $text = mb_strtolower($e->note.' '.$r->name);

            if (mb_strtolower((string) $r->cuisine) === $wanted) {
                $add(5, "{$r->cuisine}, as you asked");
            } elseif (str_contains($text, $wanted)) {
                $add(3, "Your note mentions {$a->cuisine}");
            } else {
                $add(-4);
            }
        }

        // Who is coming.
        if ($a->company === 'clients') {
            if ($occasion === Occasion::BusinessLunch) {
                $add(3, 'You keep it for business');
            }
            if (in_array('clients', $good, true)) {
                $add(3, 'You marked it good for clients');
            }
        } elseif ($a->company === 'friends') {
            if (in_array('groups', $good, true)) {
                $add(2, 'Good for groups');
            }
            if (in_array($occasion, [Occasion::Casual, Occasion::Bars], true)) {
                $add(1.5);
            }
        } elseif ($a->company === 'partner') {
            if (in_array('for_two', $good, true)) {
                $add(3, 'You marked it good for two');
            }
            if ($occasion === Occasion::SpecialOccasions) {
                $add(2, 'One of your special-occasion places');
            }
        } elseif ($a->company === 'family') {
            if ($occasion === Occasion::Casual) {
                $add(2, 'Easy and relaxed');
            }
            if ($occasion === Occasion::Suburban) {
                $add(1.5, 'Close to home');
            }
            if (in_array('groups', $good, true)) {
                $add(1);
            }
        }

        // What kind of night.
        if ($a->mood === 'sure') {
            $add(($been ? 2 : 0) + ($e->favourite ? 2 : 0));
        } elseif ($a->mood === 'new') {
            $been ? $add(-2) : $add(6, 'On your wishlist'.($e->recommended_by ? ", tip from {$e->recommended_by}" : ''));
        } elseif ($a->mood === 'special' && $occasion === Occasion::SpecialOccasions) {
            $add(4, 'One of your special-occasion places');
        } elseif ($a->mood === 'relaxed') {
            if ($occasion === Occasion::Casual) {
                $add(3, 'Easy and relaxed');
            }
            if ($occasion === Occasion::Suburban) {
                $add(2, 'Close to home');
            }
        } elseif ($a->mood === 'drinks') {
            if ($occasion === Occasion::Bars) {
                $add(4, 'One of your bars');
            }
            if (in_array('wine_list', $good, true)) {
                $add(2, 'Good wine list');
            }
            if (in_array('drinks', $good, true)) {
                $add(2);
            }
        }

        // A table for many.
        if ($a->guests >= 6 && in_array('groups', $good, true)) {
            $add(3, "Works for {$a->guests}");
        }

        if ($e->note && ! in_array(mb_strtolower(trim($e->note, ' .')), ['to explore', 'to try'], true)) {
            $reasons[] = 'Your note: “'.str($e->note)->limit(80).'”';
        }

        if ($reasons === []) {
            $reasons[] = $been ? 'A place you know' : 'On your wishlist';
        }

        return [round($score, 1), array_values(array_unique($reasons))];
    }

    private function rulesIntro(TonightAnswers $a): string
    {
        $bits = array_filter([
            $a->cuisine,
            ['clients' => 'with clients', 'friends' => 'with friends', 'partner' => 'for two', 'family' => 'with family'][$a->company] ?? null,
            ['sure' => 'a sure thing', 'new' => 'somewhere new', 'special' => 'something special', 'relaxed' => 'easy and relaxed', 'drinks' => 'drinks'][$a->mood] ?? null,
        ]);

        return $bits === []
            ? 'Your best bets for tonight.'
            : 'Your best bets for '.implode(', ', $bits).'.';
    }

    /**
     * @param  list<string>  $reasons
     * @return array<string, mixed>
     */
    private static function present(SavedEntry $e, float $score, array $reasons): array
    {
        $r = $e->restaurant;

        return [
            'id' => $e->id,
            'restaurantId' => $r->id,
            'name' => $r->name,
            'area' => $r->area,
            'city' => $r->city,
            'cuisine' => $r->cuisine,
            'occasion' => $r->occasion?->value,
            'goodFor' => $e->good_for ?? [],
            'status' => $e->status->value,
            'favourite' => $e->favourite,
            'rating' => $e->rating,
            'note' => $e->note,
            'recommendedBy' => $e->recommended_by,
            'website' => $r->website,
            'score' => $score,
            'reasons' => $reasons,
        ];
    }
}
