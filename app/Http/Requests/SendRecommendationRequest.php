<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SendRecommendationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'to' => ['array', 'required_without:public'],
            'to.*' => ['integer', 'exists:users,id'],
            'public' => ['boolean'],
            'message' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
