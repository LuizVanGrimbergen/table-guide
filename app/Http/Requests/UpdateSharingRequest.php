<?php

namespace App\Http\Requests;

use App\Enums\Visibility;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSharingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'taste_tags' => ['sometimes', 'array', 'max:12'],
            'taste_tags.*' => ['string', 'max:40'],
            'visibility' => ['sometimes', Rule::enum(Visibility::class)],
        ];
    }
}
