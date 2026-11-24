<?php

namespace App\Http\Controllers;

use App\Http\Requests\AvailabilityRequest;
use App\Models\Restaurant;
use App\Services\Availability\AvailabilityManager;
use App\Services\Availability\SlotMatch;
use App\Support\CollectionPresenter;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Free tables at the chosen time for the places in his table checker.
 * Only shows times the platforms returned; never books anything.
 */
class AvailabilityController extends Controller
{
    public function __construct(private readonly AvailabilityManager $availability) {}

    /**
     * The screen. Cards show straight away; each then asks for its own
     * free times, so a slow platform never holds up the rest.
     */
    public function page(Request $request): Response
    {
        $user = $request->user();
        $city = CollectionPresenter::homeCity($user);
        $now = CarbonImmutable::now((string) config("collection.cities.{$city}.timezone", config('app.timezone')));

        return Inertia::render('tables', [
            'restaurants' => $this->checkerRestaurants($user->id)
                ->map(fn (Restaurant $r) => [
                    'restaurantId' => $r->id,
                    'name' => $r->name,
                    'area' => $r->area,
                    'cuisine' => $r->cuisine,
                    'providerLabel' => $r->booking_provider->label(),
                    'phone' => $r->phone,
                ])->all(),
            'today' => $now->format('Y-m-d'),
            'initial' => [...self::defaultChoice($now), ...$this->choiceFrom($request)],
        ]);
    }

    /**
     * Tonight at 19:00 by default; later in the evening the next quarter
     * hour from half an hour on; after 22:00, tomorrow at 19:00.
     *
     * @return array{date: string, time: string, party: int}
     */
    public static function defaultChoice(CarbonImmutable $now): array
    {
        if ($now->format('H:i') >= '22:00') {
            return ['date' => $now->addDay()->format('Y-m-d'), 'time' => '19:00', 'party' => 2];
        }

        // Half an hour from now, rounded up to the quarter hour.
        $minutes = (int) ceil(($now->hour * 60 + $now->minute + 30) / 15) * 15;
        $soonest = sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60);

        return ['date' => $now->format('Y-m-d'), 'time' => max('19:00', $soonest), 'party' => 2];
    }

    /**
     * Choices passed in the link, e.g. /tables?party=4 from Tonight. Only
     * well-formed values are kept.
     *
     * @return array{date?: string, time?: string, party?: int}
     */
    private function choiceFrom(Request $request): array
    {
        $choice = [];
        $date = $request->query('date');
        $time = $request->query('time');
        $party = $request->query('party');

        if (is_string($date) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $choice['date'] = $date;
        }

        if (is_string($time) && preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $time)) {
            $choice['time'] = $time;
        }

        if (is_numeric($party) && (int) $party >= 1 && (int) $party <= 8) {
            $choice['party'] = (int) $party;
        }

        return $choice;
    }

    /** @return Collection<int, Restaurant> */
    private function checkerRestaurants(int $userId): Collection
    {
        return Restaurant::query()
            ->whereHas('savedEntries', fn (Builder $q) => $q->where('user_id', $userId)->where('in_checker', true))
            ->orderBy('name')
            ->get();
    }

    /** Every restaurant in his checker at once. */
    public function index(AvailabilityRequest $request): JsonResponse
    {
        $restaurants = $this->checkerRestaurants($request->user()->id);

        $results = $this->availability->getMany($restaurants, $request->checkDate(), $request->partySize());

        return response()->json([
            'restaurants' => $restaurants
                ->map(fn (Restaurant $r) => $this->present($r, $results[$r->id], $request->checkDate(), $request->checkTime(), $request->partySize()))
                ->all(),
        ]);
    }

    /** One restaurant, so each card can load on its own. */
    public function show(AvailabilityRequest $request, Restaurant $restaurant): JsonResponse
    {
        abort_unless(
            $request->user()->savedEntries()->where('restaurant_id', $restaurant->id)->exists(),
            404,
        );

        $result = $this->availability->getSlots($restaurant, $request->checkDate(), $request->partySize());

        return response()->json($this->present($restaurant, $result, $request->checkDate(), $request->checkTime(), $request->partySize()));
    }

    /**
     * @param  array{available: bool, slots: list<string>, error: ?string}  $result
     * @return array<string, mixed>
     */
    private function present(Restaurant $r, array $result, CarbonImmutable $date, string $time, int $party): array
    {
        $match = SlotMatch::for($result, $time);
        $link = fn (string $at) => $this->availability->bookingLink($r, $date, $at, $party);

        return [
            'restaurantId' => $r->id,
            'name' => $r->name,
            'area' => $r->area,
            'cuisine' => $r->cuisine,
            // No photos yet: the screen shows the colour block instead.
            'photo' => null,
            'provider' => $r->booking_provider->value,
            'providerLabel' => $r->booking_provider->label(),
            'phone' => $r->phone,
            'status' => $match['status']->value,
            'error' => $result['error'],
            'requested' => $match['requested'] ? ['time' => $match['requested'], 'bookingUrl' => $link($match['requested'])] : null,
            'nearest' => array_map(fn (string $at) => ['time' => $at, 'bookingUrl' => $link($at)], $match['nearest']),
            'bookingUrl' => $link($time),
        ];
    }
}
