<?php

namespace App\Http\Requests;

use App\Enums\BookingProvider;
use App\Models\Restaurant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** How a restaurant takes bookings: platform, its venue id, booking link. */
class UpdateRestaurantBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        $restaurant = $this->route('restaurant');

        return $restaurant instanceof Restaurant && $this->user()->can('update', $restaurant);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'booking_provider' => ['required', Rule::enum(BookingProvider::class)],
            'booking_venue_id' => ['nullable', 'string', 'max:255'],
            'booking_url' => ['nullable', 'url:http,https', 'max:2048'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'booking_url.url' => 'That does not look like a web link. It should start with https://',
        ];
    }
}
