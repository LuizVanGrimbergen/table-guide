<?php

namespace App\Http\Controllers;

use App\Services\GooglePlaces;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Search Google Places for the Add sheet. Runs on the server so the
 * Places key never reaches the browser.
 */
class PlaceSearchController extends Controller
{
    private const array FIELDS = ['id', 'displayName', 'formattedAddress', 'location', 'addressComponents'];

    public function __invoke(Request $request, GooglePlaces $places): JsonResponse
    {
        $data = $request->validate([
            'q' => ['required', 'string', 'min:3', 'max:120'],
            'city' => ['nullable', 'string', 'max:80'],
        ]);

        if (! $places->isConfigured()) {
            return response()->json(['results' => [], 'available' => false]);
        }

        $city = config('collection.cities.'.($data['city'] ?? ''));
        $query = trim($data['q'].' '.($city ? $data['city'] : ''));

        try {
            $results = $places->search(
                $query,
                self::FIELDS,
                $city ? ['lat' => $city['lat'], 'lng' => $city['lng'], 'radius' => 50000.0] : null,
                $city['region'] ?? null,
                5,
            );
        } catch (RequestException|ConnectionException) {
            return response()->json(['results' => [], 'available' => true, 'error' => 'Google search is not responding. You can still add the place by hand.'], 502);
        }

        return response()->json([
            'available' => true,
            'results' => array_map(fn (array $p) => self::present($p, $data['city'] ?? null), $results),
        ]);
    }

    /**
     * @param  array<string, mixed>  $place
     * @return array<string, mixed>
     */
    private static function present(array $place, ?string $fallbackCity): array
    {
        $component = function (array $types) use ($place): ?string {
            foreach ($types as $type) {
                foreach ($place['addressComponents'] ?? [] as $c) {
                    if (in_array($type, $c['types'] ?? [], true)) {
                        return $c['longText'] ?? null;
                    }
                }
            }

            return null;
        };

        // Match Google's locality to one of his known cities (e.g. "Surry Hills" is in Sydney).
        $locality = $component(['locality', 'postal_town']);
        $knownCity = $fallbackCity && config("collection.cities.{$fallbackCity}") ? $fallbackCity : null;
        $city = $locality && config("collection.cities.{$locality}") ? $locality : ($knownCity ?? $locality ?? $component(['administrative_area_level_2']));
        $area = $component(['sublocality_level_1', 'neighborhood']) ?? ($locality !== $city ? $locality : null);

        return [
            'placeId' => $place['id'] ?? null,
            'name' => $place['displayName']['text'] ?? '',
            'address' => $place['formattedAddress'] ?? null,
            'city' => $city,
            'area' => $area,
            'lat' => $place['location']['latitude'] ?? null,
            'lng' => $place['location']['longitude'] ?? null,
        ];
    }
}
