<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Thin client for Google Places API (New). Server side only: the key
 * never reaches the browser.
 */
class GooglePlaces
{
    private const string TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

    public function __construct(private readonly ?string $apiKey) {}

    public function isConfigured(): bool
    {
        return filled($this->apiKey);
    }

    /**
     * Return the single best Text Search match, or null when nothing matched.
     *
     * @param  list<string>  $fields  Place fields without the "places." prefix.
     * @param  array{lat: float, lng: float, radius: float}|null  $bias
     * @return array<string, mixed>|null
     *
     * @throws RequestException|ConnectionException
     */
    public function findPlace(string $query, array $fields, ?array $bias = null, ?string $regionCode = null): ?array
    {
        return $this->search($query, $fields, $bias, $regionCode, 1)[0] ?? null;
    }

    /**
     * Up to $limit Text Search matches.
     *
     * @param  list<string>  $fields  Place fields without the "places." prefix.
     * @param  array{lat: float, lng: float, radius: float}|null  $bias
     * @return list<array<string, mixed>>
     *
     * @throws RequestException|ConnectionException
     */
    public function search(string $query, array $fields, ?array $bias = null, ?string $regionCode = null, int $limit = 5): array
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('GOOGLE_PLACES_SERVER_KEY is not set.');
        }

        $body = array_filter([
            'textQuery' => $query,
            'maxResultCount' => $limit,
            'languageCode' => 'en',
            'regionCode' => $regionCode,
            'locationBias' => $bias ? [
                'circle' => [
                    'center' => ['latitude' => $bias['lat'], 'longitude' => $bias['lng']],
                    'radius' => min($bias['radius'], 50000.0),
                ],
            ] : null,
        ], fn ($value) => $value !== null);

        $response = Http::withHeaders([
            'X-Goog-Api-Key' => $this->apiKey,
            'X-Goog-FieldMask' => collect($fields)->map(fn ($f) => "places.$f")->implode(','),
        ])
            ->timeout(15)
            ->retry(3, 2000, fn ($e) => $e instanceof ConnectionException
                || ($e instanceof RequestException && in_array($e->response->status(), [429, 500, 502, 503, 504], true)))
            ->post(self::TEXT_SEARCH_URL, $body)
            ->throw();

        return array_values($response->json('places') ?? []);
    }
}
