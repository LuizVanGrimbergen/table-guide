<?php

namespace App\Http\Requests;

use App\Services\Tonight\TonightAnswers;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TonightSuggestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'city' => ['required', 'string', 'max:80'],
            'guests' => ['required', 'integer', 'between:1,30'],
            'cuisine' => ['nullable', 'string', 'max:40'],
            'company' => ['nullable', Rule::in(TonightAnswers::COMPANY)],
            'mood' => ['nullable', Rule::in(TonightAnswers::MOOD)],
            'wish' => ['nullable', 'string', 'max:300'],
        ];
    }

    public function answers(): TonightAnswers
    {
        $d = $this->validated();

        return new TonightAnswers(
            city: $d['city'],
            guests: (int) $d['guests'],
            cuisine: $d['cuisine'] ?? null ?: null,
            company: $d['company'] ?? null,
            mood: $d['mood'] ?? null,
            wish: trim((string) ($d['wish'] ?? '')) ?: null,
        );
    }
}
