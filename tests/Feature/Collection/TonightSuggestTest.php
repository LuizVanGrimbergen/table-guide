<?php

use App\Enums\VerifyStatus;
use App\Models\Restaurant;
use App\Models\SavedEntry;
use App\Models\User;
use App\Services\Tonight\DinnerAi;
use App\Services\Tonight\TonightAnswers;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function savedPlace(User $user, array $restaurant, array $entry = []): SavedEntry
{
    return SavedEntry::factory()->for($user)
        ->for(Restaurant::factory()->create(['city' => 'Sydney', 'cuisine' => null, ...$restaurant]))
        ->create(['note' => null, 'good_for' => [], ...$entry]);
}

/** A stand-in for Claude that returns whatever the test tells it to. */
function fakeAi(?Closure $choose): void
{
    app()->bind(DinnerAi::class, fn () => new class($choose) implements DinnerAi
    {
        public array $calls = [];

        public function __construct(private ?Closure $choose) {}

        public function isAvailable(): bool
        {
            return $this->choose !== null;
        }

        public function choose(TonightAnswers $answers, array $shortlist): array
        {
            return ($this->choose)($answers, $shortlist);
        }
    });
}

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->pilu = savedPlace($this->user, ['name' => 'Pilu', 'cuisine' => 'Italian', 'occasion' => 'special_occasions'], ['favourite' => true]);
    $this->grappa = savedPlace($this->user, ['name' => 'Grappa', 'cuisine' => 'Italian', 'occasion' => 'casual'], ['note' => 'Best Italian in the inner west']);
    $this->sushi = savedPlace($this->user, ['name' => 'Sushi Place', 'cuisine' => 'Japanese', 'occasion' => 'business_lunch'], ['good_for' => ['clients']]);
    $this->newOne = savedPlace($this->user, ['name' => 'New Trattoria', 'occasion' => 'casual'], ['status' => 'wish', 'note' => 'Italian, Luiz says go', 'recommended_by' => 'Luiz']);
    $this->avoid = savedPlace($this->user, ['name' => 'Avoid Me', 'cuisine' => 'Italian'], ['not_recommended' => true, 'favourite' => true]);
    $this->closed = savedPlace($this->user, ['name' => 'Gone', 'cuisine' => 'Italian', 'verify_status' => VerifyStatus::PossiblyClosed], ['favourite' => true]);
    savedPlace($this->user, ['name' => 'Melbourne Italian', 'city' => 'Melbourne', 'cuisine' => 'Italian'], ['favourite' => true]);
    fakeAi(null);
});

function ask(array $answers = [])
{
    return test()->actingAs(test()->user)->postJson('/tonight/suggest', ['city' => 'Sydney', 'guests' => 2, ...$answers]);
}

test('without AI, the rules pick his best matching places and say why', function () {
    $response = ask(['cuisine' => 'Italian', 'company' => 'partner', 'mood' => 'special'])->assertOk();

    expect($response->json('source'))->toBe('rules')
        ->and($response->json('picks.0.name'))->toBe('Pilu')
        ->and($response->json('picks.0.headline'))->toBe('One of your favourites')
        ->and($response->json('picks.0.why'))->toContain('Italian, as you asked')
        ->and($response->json('picks.0.why'))->not->toContain('One of your favourites')
        ->and(collect($response->json('picks'))->pluck('name'))->toContain('Grappa');
});

test('never suggests places he does not recommend, possibly closed places, or other cities', function () {
    $names = collect(ask(['cuisine' => 'Italian'])->json('picks'))->pluck('name');

    expect($names)->not->toContain('Avoid Me')
        ->and($names)->not->toContain('Gone')
        ->and($names)->not->toContain('Melbourne Italian');
});

test('"somewhere new" puts his wishlist first, with who recommended it', function () {
    $response = ask(['mood' => 'new', 'cuisine' => 'Italian']);

    expect($response->json('picks.0.name'))->toBe('New Trattoria')
        ->and($response->json('picks.0.headline').' '.$response->json('picks.0.why'))->toContain('tip from Luiz')
        ->and($response->json('picks.0.headline').' '.$response->json('picks.0.why'))->toContain('Your note mentions Italian');
});

test('clients lifts places he keeps for business', function () {
    expect(ask(['company' => 'clients'])->json('picks.0.name'))->toBe('Sushi Place');
});

test('with AI, Claude chooses and explains, from his shortlist only', function () {
    $seen = null;
    fakeAi(function (TonightAnswers $a, array $shortlist) use (&$seen) {
        $seen = [$a, $shortlist];

        return [
            'intro' => 'A cosy Italian night for two.',
            'picks' => [
                ['id' => $this->grappa->id, 'headline' => 'Your best Italian', 'why' => 'You called it the best Italian in the inner west.'],
                ['id' => 999999, 'headline' => 'Invented', 'why' => 'Not his place.'],
                ['id' => $this->grappa->id, 'headline' => 'Duplicate', 'why' => 'Twice.'],
            ],
        ];
    });

    $response = ask(['cuisine' => 'Italian', 'company' => 'partner', 'wish' => 'quiet please'])->assertOk();

    expect($response->json('source'))->toBe('ai')
        ->and($response->json('intro'))->toBe('A cosy Italian night for two.')
        ->and($response->json('picks'))->toHaveCount(1)
        ->and($response->json('picks.0.name'))->toBe('Grappa')
        ->and($response->json('picks.0.why'))->toBe('You called it the best Italian in the inner west.');

    // Claude saw his answers and only his eligible Sydney places.
    expect($seen[0]->wish)->toBe('quiet please')
        ->and(collect($seen[1])->pluck('name'))->not->toContain('Avoid Me')
        ->and(collect($seen[1])->pluck('name'))->not->toContain('Melbourne Italian');
});

test('if Claude fails or invents everything, the rules answer instead', function (Closure $choose) {
    fakeAi($choose);

    $response = ask(['cuisine' => 'Italian'])->assertOk();

    expect($response->json('source'))->toBe('rules')
        ->and($response->json('picks'))->not->toBeEmpty();
})->with([
    'error' => [fn () => throw new RuntimeException('API down')],
    'only invented ids' => [fn () => ['intro' => 'x', 'picks' => [['id' => 123456, 'headline' => 'x', 'why' => 'x']]]],
]);

test('answers are validated', function () {
    ask(['company' => 'aliens'])->assertUnprocessable()->assertJsonValidationErrors('company');
    ask(['wish' => str_repeat('a', 301)])->assertUnprocessable();
    auth()->logout();
    $this->postJson('/tonight/suggest', ['city' => 'Sydney', 'guests' => 2])->assertUnauthorized();
});

test('an empty city says so instead of erroring', function () {
    $response = ask(['city' => 'Paris'])->assertOk();

    expect($response->json('picks'))->toBe([])
        ->and($response->json('intro'))->toContain('Paris');
});

test('only his own places are ever considered', function () {
    $other = User::factory()->create();
    savedPlace($other, ['name' => 'Someone Else Italian', 'cuisine' => 'Italian'], ['favourite' => true, 'rating' => 5]);

    expect(collect(ask(['cuisine' => 'Italian'])->json('picks'))->pluck('name'))->not->toContain('Someone Else Italian');
});
