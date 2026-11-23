<?php

namespace App\Actions;

use App\Enums\VerifyStatus;
use App\Models\Restaurant;
use App\Services\GooglePlaces;
use Illuminate\Support\Str;

/**
 * Finds a restaurant's Google place with one Text Search call and stores
 * its place id and location. Only ever writes to `restaurants`; personal
 * saved entries are never touched.
 */
class GeocodeRestaurant
{
    public const string MATCHED = 'matched';

    public const string NEEDS_REVIEW = 'needs_review';

    public const string NOT_FOUND = 'not_found';

    public const string POSSIBLY_CLOSED = 'possibly_closed';

    /**
     * id + location is what we store. displayName, formattedAddress,
     * addressComponents and businessStatus sit in the same Text Search
     * billing tier as location, and let us judge how certain a match is.
     */
    public const array FIELDS = ['id', 'location', 'displayName', 'formattedAddress', 'addressComponents', 'businessStatus'];

    public function __construct(private readonly GooglePlaces $places) {}

    /**
     * @return array{outcome: string, reason: string|null}
     */
    public function handle(Restaurant $restaurant): array
    {
        $city = config("collection.cities.{$restaurant->city}");
        $query = collect([$restaurant->name, $restaurant->area, $restaurant->city])->filter()->unique()->implode(', ');

        $place = $this->places->findPlace(
            $query,
            self::FIELDS,
            $city ? ['lat' => $city['lat'], 'lng' => $city['lng'], 'radius' => 50000.0] : null,
            $city['region'] ?? null,
        );

        $restaurant->geocoded_at = now();

        if ($place === null || empty($place['id'])) {
            $restaurant->verify_status = VerifyStatus::NeedsReview;
            $restaurant->save();

            return ['outcome' => self::NOT_FOUND, 'reason' => 'No Places result'];
        }

        $reasons = $this->doubts($restaurant, $place, $city);

        $takenBy = Restaurant::query()
            ->where('google_place_id', $place['id'])
            ->whereKeyNot($restaurant->id)
            ->value('name');

        if ($takenBy !== null) {
            // Two of his entries resolve to the same place: let a human decide.
            $restaurant->verify_status = VerifyStatus::NeedsReview;
            $restaurant->save();

            return ['outcome' => self::NEEDS_REVIEW, 'reason' => "Same place as \"{$takenBy}\""];
        }

        $restaurant->google_place_id = $place['id'];
        $restaurant->lat = $place['location']['latitude'] ?? null;
        $restaurant->lng = $place['location']['longitude'] ?? null;
        $restaurant->address ??= $place['formattedAddress'] ?? null;
        $restaurant->area ??= $this->areaFrom($place, $restaurant->city);

        $outcome = self::MATCHED;

        if (($place['businessStatus'] ?? null) === 'CLOSED_PERMANENTLY') {
            // Google's word alone is not a reliable enough confirmation for "closed".
            $restaurant->verify_status = VerifyStatus::PossiblyClosed;
            $outcome = self::POSSIBLY_CLOSED;
            $reasons[] = 'Google lists it as permanently closed';
        } elseif ($reasons !== [] || ($place['businessStatus'] ?? null) === 'CLOSED_TEMPORARILY') {
            $restaurant->verify_status = VerifyStatus::NeedsReview;
            $outcome = self::NEEDS_REVIEW;
            if (($place['businessStatus'] ?? null) === 'CLOSED_TEMPORARILY') {
                $reasons[] = 'Google lists it as temporarily closed';
            }
        } elseif ($restaurant->verify_status === VerifyStatus::NeedsReview) {
            // A confident retry clears an earlier doubt.
            $restaurant->verify_status = null;
        }

        $restaurant->save();

        return ['outcome' => $outcome, 'reason' => $reasons === [] ? null : implode('; ', $reasons)];
    }

    /**
     * @param  array<string, mixed>  $place
     * @param  array<string, mixed>|null  $city
     * @return list<string>
     */
    private function doubts(Restaurant $restaurant, array $place, ?array $city): array
    {
        $doubts = [];
        $found = (string) ($place['displayName']['text'] ?? '');
        $similarity = self::nameSimilarity($restaurant->name, $found);

        if ($similarity < config('collection.geocode.min_name_similarity')) {
            $doubts[] = "Name differs: \"{$found}\" ({$similarity}%)";
        }

        $lat = $place['location']['latitude'] ?? null;
        $lng = $place['location']['longitude'] ?? null;

        if ($city && $lat !== null && $lng !== null) {
            $km = self::distanceKm($city['lat'], $city['lng'], (float) $lat, (float) $lng);
            if ($km > config('collection.geocode.max_distance_km')) {
                $doubts[] = sprintf('%d km from %s', $km, $restaurant->city);
            }
        }

        return $doubts;
    }

    /** @param array<string, mixed> $place */
    private function areaFrom(array $place, string $city): ?string
    {
        $components = is_array($place['addressComponents'] ?? null) ? $place['addressComponents'] : [];

        foreach (['sublocality_level_1', 'neighborhood', 'locality'] as $type) {
            foreach ($components as $component) {
                $name = $component['longText'] ?? null;

                if (in_array($type, $component['types'] ?? [], true) && is_string($name) && strcasecmp($name, $city) !== 0) {
                    return $name;
                }
            }
        }

        return null;
    }

    public static function nameSimilarity(string $a, string $b): int
    {
        $a = self::normaliseName($a);
        $b = self::normaliseName($b);

        if ($a === '' || $b === '') {
            return 0;
        }

        if (str_contains($a, $b) || str_contains($b, $a)) {
            return 100;
        }

        similar_text($a, $b, $percent);

        return (int) round($percent);
    }

    private static function normaliseName(string $name): string
    {
        $name = Str::of($name)->ascii()->lower()->replaceMatches('/[^a-z0-9 ]+/', ' ')->toString();
        $words = array_diff(preg_split('/\s+/', $name, -1, PREG_SPLIT_NO_EMPTY) ?: [], ['the', 'and', 'restaurant', 'ristorante', 'bar', 'cafe', 'hotel']);

        return implode(' ', $words);
    }

    public static function distanceKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $h = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return 6371 * 2 * asin(min(1, sqrt($h)));
    }
}
