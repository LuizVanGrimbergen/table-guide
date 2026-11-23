<?php

namespace App\Http\Controllers;

use App\Support\CollectionPresenter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The four main screens. Each gets the user's own collection; filtering,
 * search and ranking happen in the browser (resources/js/lib/collection.ts).
 */
class CollectionController extends Controller
{
    public function home(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('home', [
            ...$this->shared($request),
            'received' => FriendsController::received($user, $user->savedRestaurantIds(), 5),
        ]);
    }

    public function index(Request $request): Response
    {
        return Inertia::render('collection', [
            ...$this->shared($request),
            // Initial filters, e.g. from a Home tile: /collection?occ=bars&hideAvoid=1
            'initial' => $request->only(['q', 'occ', 'status', 'city', 'hideAvoid', 'cuisine', 'good', 'focus']),
        ]);
    }

    public function map(Request $request): Response
    {
        return Inertia::render('map', [
            ...$this->shared($request),
            'mapId' => config('services.google.map_id'),
            'cities' => config('collection.cities'),
        ]);
    }

    public function tonight(Request $request): Response
    {
        return Inertia::render('tonight', [
            ...$this->shared($request),
            'aiEnabled' => filled(config('services.anthropic.key')),
        ]);
    }

    /** @return array<string, mixed> */
    private function shared(Request $request): array
    {
        $user = $request->user();

        return [
            'places' => CollectionPresenter::places($user),
            'homeCity' => CollectionPresenter::homeCity($user),
        ];
    }
}
