<?php

namespace App\Actions;

use App\Enums\EntryStatus;
use App\Enums\Occasion;
use App\Models\Restaurant;
use App\Models\SavedEntry;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Turns a structured list (data/restaurants.json) into restaurants and
 * saved entries for one user. Safe to run twice: existing saved entries
 * are never overwritten, and existing restaurants only get blanks filled.
 */
class ImportCollection
{
    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array{restaurants_created: int, restaurants_reused: int, entries_created: int, entries_skipped: int}
     */
    public function handle(User $user, array $rows): array
    {
        $stats = ['restaurants_created' => 0, 'restaurants_reused' => 0, 'entries_created' => 0, 'entries_skipped' => 0];

        DB::transaction(function () use ($user, $rows, &$stats) {
            foreach ($rows as $index => $row) {
                $name = trim((string) ($row['name'] ?? ''));
                $city = trim((string) ($row['city'] ?? ''));

                if ($name === '' || $city === '') {
                    throw new InvalidArgumentException("Row {$index} is missing a name or city.");
                }

                $facts = array_filter([
                    'area' => self::clean($row['area'] ?? null),
                    'country' => config("collection.cities.{$city}.country"),
                    'cuisine' => self::clean($row['cuisine'] ?? null),
                    'occasion' => Occasion::tryFrom((string) ($row['occasion'] ?? ''))?->value,
                    'website' => self::clean($row['website'] ?? null),
                ], fn ($value) => $value !== null);

                $restaurant = Restaurant::query()->where('name', $name)->where('city', $city)->first();

                if ($restaurant) {
                    // Only fill gaps; never overwrite facts that are already there.
                    foreach ($facts as $key => $value) {
                        if (blank($restaurant->getAttribute($key))) {
                            $restaurant->setAttribute($key, $value);
                        }
                    }
                    $restaurant->save();
                    $stats['restaurants_reused']++;
                } else {
                    $restaurant = Restaurant::create(['name' => $name, 'city' => $city, ...$facts]);
                    $stats['restaurants_created']++;
                }

                $entry = SavedEntry::firstOrNew(['user_id' => $user->id, 'restaurant_id' => $restaurant->id]);

                if ($entry->exists) {
                    $stats['entries_skipped']++;

                    continue;
                }

                $entry->fill([
                    'status' => EntryStatus::tryFrom((string) ($row['status'] ?? '')) ?? EntryStatus::Wish,
                    'favourite' => (bool) ($row['favourite'] ?? false),
                    'not_recommended' => (bool) ($row['not_recommended'] ?? false),
                    'note' => self::clean($row['note'] ?? null),
                    'good_for' => array_values(array_filter((array) ($row['good_for'] ?? []), 'is_string')),
                    'visibility' => $user->default_visibility,
                ])->save();

                $stats['entries_created']++;
            }
        });

        return $stats;
    }

    private static function clean(mixed $value): ?string
    {
        $value = is_string($value) ? trim($value) : null;

        return $value === '' ? null : $value;
    }
}
