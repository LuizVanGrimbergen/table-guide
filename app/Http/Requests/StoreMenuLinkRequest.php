<?php

namespace App\Http\Requests;

use App\Enums\MenuLinkKind;
use App\Models\MenuLink;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMenuLinkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', MenuLink::class);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'url' => ['required', 'url:http,https', 'max:2048'],
            'kind' => ['required', Rule::enum(MenuLinkKind::class)],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['url.url' => 'Paste the full web address, starting with https://'];
    }
}
