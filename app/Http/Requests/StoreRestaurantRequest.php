<?php

namespace App\Http\Requests;

use App\Enums\EntryStatus;
use App\Models\Restaurant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRestaurantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Restaurant::class);
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => trim((string) $this->input('name')),
            'city' => trim((string) $this->input('city')),
            'area' => trim((string) $this->input('area')) ?: null,
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:255'],
            'area' => ['nullable', 'string', 'max:255'],
            'website' => ['nullable', 'url:http,https', 'max:2048'],
            'status' => ['required', Rule::enum(EntryStatus::class)],
            'note' => ['nullable', 'string', 'max:5000'],
            'google_place_id' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'lat' => ['nullable', 'numeric', 'between:-90,90', 'required_with:google_place_id'],
            'lng' => ['nullable', 'numeric', 'between:-180,180', 'required_with:google_place_id'],
        ];
    }
}
