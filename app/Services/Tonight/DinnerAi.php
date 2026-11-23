<?php

namespace App\Services\Tonight;

interface DinnerAi
{
    public function isAvailable(): bool;

    /**
     * Choose up to three places from $shortlist and say why.
     *
     * @param  list<array<string, mixed>>  $shortlist
     * @return array{intro: string, picks: list<array{id: int, headline: string, why: string}>}
     */
    public function choose(TonightAnswers $answers, array $shortlist): array;
}
