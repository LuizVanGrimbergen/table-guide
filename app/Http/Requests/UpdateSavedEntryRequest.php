<?php

namespace App\Http\Requests;

use App\Enums\EntryStatus;
use App\Enums\Visibility;
use App\Models\SavedEntry;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSavedEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        $entry = $this->route('entry');

        return $entry instanceof SavedEntry && $this->user()->can('update', $entry);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'status' => ['sometimes', Rule::enum(EntryStatus::class)],
            'favourite' => ['sometimes', 'boolean'],
            'not_recommended' => ['sometimes', 'boolean'],
            'in_checker' => ['sometimes', 'boolean'],
            'rating' => ['sometimes', 'nullable', 'integer', 'between:1,5'],
            'note' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'visibility' => ['sometimes', Rule::enum(Visibility::class)],
        ];
    }
}
