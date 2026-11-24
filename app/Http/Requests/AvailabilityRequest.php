<?php

namespace App\Http\Requests;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;

/** Date, time and party size for the table checker. */
class AvailabilityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            // "yesterday" so Sydney's today is never refused while the server is still on yesterday (UTC).
            'date' => ['required', 'date_format:Y-m-d', 'after_or_equal:yesterday', 'before_or_equal:+120 days'],
            'time' => ['required', 'date_format:H:i'],
            'party' => ['required', 'integer', 'between:1,8'],
        ];
    }

    public function checkDate(): CarbonImmutable
    {
        /** @var string $date */
        $date = $this->validated('date');

        return CarbonImmutable::createFromFormat('Y-m-d', $date)->startOfDay();
    }

    public function checkTime(): string
    {
        return (string) $this->validated('time');
    }

    public function partySize(): int
    {
        return (int) $this->validated('party');
    }
}
