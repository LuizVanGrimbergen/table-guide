<?php

namespace App\Http\Controllers;

use App\Enums\EntryStatus;
use App\Http\Requests\StoreRestaurantRequest;
use App\Http\Requests\UpdateRestaurantBookingRequest;
use App\Models\Restaurant;
use App\Models\SavedEntry;
use App\Models\User;
use App\Support\CollectionPresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RestaurantController extends Controller
{
    public function show(Request $request, Restaurant $restaurant): Response
    {
        $this->authorize('view', $restaurant);
        $user = $request->user();
        $entry = $restaurant->savedEntries()->where('user_id', $user->id)->first();

        return Inertia::render('restaurant', [
            'restaurant' => CollectionPresenter::restaurant($restaurant, $user),
            'entry' => $entry ? CollectionPresenter::place($entry->setRelation('restaurant', $restaurant)) : null,
            'friends' => User::whereIn('id', $user->friendIds())->orderBy('name')->get()
                ->map(fn (User $f) => ['id' => $f->id, 'name' => $f->name, 'tasteTags' => $f->taste_tags ?? []]),
        ]);
    }

    /**
     * Manual add (Places search comes once a key is configured). Reuses a
     * shared restaurant with the same name and city instead of duplicating it.
     */
    public function store(StoreRestaurantRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $user = $request->user();

        $placeId = $data['google_place_id'] ?? null;

        $restaurant = ($placeId ? Restaurant::where('google_place_id', $placeId)->first() : null)
            ?? Restaurant::query()->where('name', $data['name'])->where('city', $data['city'])->first()
            ?? Restaurant::create([
                'name' => $data['name'],
                'city' => $data['city'],
                'area' => $data['area'] ?? null,
                'country' => config("collection.cities.{$data['city']}.country"),
                'website' => $data['website'] ?? null,
                'address' => $data['address'] ?? null,
                'google_place_id' => $placeId,
                'lat' => $data['lat'] ?? null,
                'lng' => $data['lng'] ?? null,
                'geocoded_at' => $placeId ? now() : null,
            ]);

        // A name+city match that was never located gets Google's details now.
        if ($placeId && $restaurant->google_place_id === null) {
            $restaurant->fill([
                'google_place_id' => $placeId,
                'lat' => $data['lat'],
                'lng' => $data['lng'],
                'address' => $restaurant->address ?? ($data['address'] ?? null),
                'geocoded_at' => now(),
            ])->save();
        }

        SavedEntry::firstOrCreate(
            ['user_id' => $user->id, 'restaurant_id' => $restaurant->id],
            [
                'status' => EntryStatus::from($data['status']),
                'note' => $data['note'] ?? null,
                'visibility' => $user->default_visibility,
            ],
        );

        return redirect()->route('restaurants.show', $restaurant)
            ->with('toast', "{$restaurant->name} is in your collection");
    }

    /** Booking platform, venue id and link. Only shared facts, never personal. */
    public function updateBooking(UpdateRestaurantBookingRequest $request, Restaurant $restaurant): RedirectResponse
    {
        $data = $request->validated();

        $restaurant->update([
            'booking_provider' => $data['booking_provider'],
            'booking_venue_id' => filled($data['booking_venue_id'] ?? null) ? trim($data['booking_venue_id']) : null,
            'booking_url' => $data['booking_url'] ?? null,
        ]);

        return back()->with('toast', 'Booking details saved');
    }
}
