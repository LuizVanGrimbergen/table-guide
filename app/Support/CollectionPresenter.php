<?php

namespace App\Support;

use App\Models\MenuLink;
use App\Models\Restaurant;
use App\Models\SavedEntry;
use App\Models\User;

/**
 * Shapes a user's collection for the React screens. The whole collection
 * goes to the browser so search and filters feel instant (and can work
 * offline later); it is small (hundreds of rows), and only ever the
 * signed-in user's own entries.
 */
class CollectionPresenter
{
    /** @return array<int, array<string, mixed>> */
    public static function places(User $user): array
    {
        return $user->savedEntries()
            ->with('restaurant')
            ->get()
            ->sortBy(fn (SavedEntry $e) => mb_strtolower($e->restaurant->name))
            ->map(fn (SavedEntry $e) => self::place($e))
            ->values()
            ->all();
    }

    /** @return array<string, mixed> */
    public static function place(SavedEntry $entry): array
    {
        $r = $entry->restaurant;

        return [
            'id' => $entry->id,
            'restaurantId' => $r->id,
            'name' => $r->name,
            'city' => $r->city,
            'area' => $r->area,
            'cuisine' => $r->cuisine,
            'occasion' => $r->occasion?->value,
            'goodFor' => $entry->good_for ?? [],
            'status' => $entry->status->value,
            'favourite' => $entry->favourite,
            'notRecommended' => $entry->not_recommended,
            'inChecker' => $entry->in_checker,
            'rating' => $entry->rating,
            'note' => $entry->note,
            'website' => $r->website,
            'bookingUrl' => $r->booking_url,
            'lat' => $r->lat,
            'lng' => $r->lng,
            'verifyStatus' => $r->verify_status?->value,
            'addedAt' => $entry->created_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    public static function restaurant(Restaurant $r, User $viewer): array
    {
        return [
            'id' => $r->id,
            'name' => $r->name,
            'city' => $r->city,
            'area' => $r->area,
            'country' => $r->country,
            'address' => $r->address,
            'cuisine' => $r->cuisine,
            'occasion' => $r->occasion?->value,
            'website' => $r->website,
            'phone' => $r->phone,
            'bookingProvider' => $r->booking_provider->value,
            'bookingVenueId' => $r->booking_venue_id,
            'bookingUrl' => $r->booking_url,
            'lat' => $r->lat,
            'lng' => $r->lng,
            'googlePlaceId' => $r->google_place_id,
            'verifyStatus' => $r->verify_status?->value,
            'verifiedAt' => $r->verified_at?->toIso8601String(),
            'timezone' => config("collection.cities.{$r->city}.timezone", config('app.timezone')),
            'canEdit' => $viewer->can('update', $r),
            'menuLinks' => $r->menuLinks()->orderBy('kind')->get()->map(fn (MenuLink $l) => [
                'id' => $l->id,
                'kind' => $l->kind->value,
                'url' => $l->url,
                'source' => $l->source->value,
                'maybeStale' => $l->maybe_stale,
                'checkedAt' => $l->checked_at?->toIso8601String(),
                'canDelete' => $viewer->can('delete', $l),
            ])->all(),
        ];
    }

    /** City he has the most places in: the default for Tonight, Home and Map. */
    public static function homeCity(User $user): string
    {
        return (string) ($user->savedEntries()
            ->join('restaurants', 'restaurants.id', '=', 'saved_entries.restaurant_id')
            ->selectRaw('restaurants.city as city, count(*) as n')
            ->groupBy('restaurants.city')
            ->orderByDesc('n')
            ->value('city') ?? 'Sydney');
    }
}
