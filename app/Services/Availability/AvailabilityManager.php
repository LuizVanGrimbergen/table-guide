<?php

namespace App\Services\Availability;

use App\Enums\BookingProvider;
use App\Models\Restaurant;
use Carbon\CarbonInterface;
use Illuminate\Contracts\Container\Container;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Throwable;

/**
 * Picks the right adapter from a restaurant's booking_provider, asks the
 * platforms in parallel, caches answers and keeps to one request per
 * restaurant per minute. One restaurant failing never stops the others.
 */
class AvailabilityManager
{
    /** @var array<string, class-string<AvailabilityProvider>> */
    private const array ADAPTERS = [
        BookingProvider::SevenRooms->value => SevenRoomsProvider::class,
        // OpenTable, Now Book It and ResDiary get an adapter here later.
    ];

    public function __construct(private readonly Container $container) {}

    /** The adapter for a platform, or null when there is none (yet). */
    public function provider(BookingProvider $provider): ?AvailabilityProvider
    {
        $class = self::ADAPTERS[$provider->value] ?? null;

        return $class ? $this->container->make($class) : null;
    }

    /** @return array{available: bool, slots: list<string>, error: ?string} */
    public function getSlots(Restaurant $restaurant, CarbonInterface $date, int $partySize): array
    {
        return $this->getMany([$restaurant], $date, $partySize)[$restaurant->id];
    }

    /**
     * Free tables for several restaurants at once. Platforms are asked in
     * parallel; answers are cached for 5 minutes; each restaurant's
     * platform is asked at most once a minute. One failing restaurant
     * never stops the others.
     *
     * @param  iterable<Restaurant>  $restaurants
     * @return array<int, array{available: bool, slots: list<string>, error: ?string}> keyed by restaurant id
     */
    public function getMany(iterable $restaurants, CarbonInterface $date, int $partySize): array
    {
        $results = [];
        /** @var array<int, array{restaurant: Restaurant, provider: HttpAvailabilityProvider, request: array{url: string, query: array<string, scalar>}}> $toAsk */
        $toAsk = [];

        foreach ($restaurants as $restaurant) {
            $id = $restaurant->id;

            try {
                $provider = $this->providerFor($restaurant, $results);

                if ($provider === null) {
                    continue;
                }

                $cached = Cache::get($this->cacheKey($restaurant, $date, $partySize));

                if (is_array($cached)) {
                    /** @var array{available: bool, slots: list<string>, error: ?string} $cached */
                    $results[$id] = $cached;

                    continue;
                }

                if ($provider instanceof HttpAvailabilityProvider) {
                    $precheck = $provider->precheck($restaurant, $date, $partySize);

                    if ($precheck !== null) {
                        $results[$id] = $precheck;

                        continue;
                    }
                }

                if (! $this->mayAsk($restaurant)) {
                    $results[$id] = SlotResult::failed('rate_limited');

                    continue;
                }

                if ($provider instanceof HttpAvailabilityProvider) {
                    /** @var array{url: string, query: array<string, scalar>} $request */
                    $request = $provider->request($restaurant, $date, $partySize);
                    $toAsk[$id] = ['restaurant' => $restaurant, 'provider' => $provider, 'request' => $request];

                    continue;
                }

                $results[$id] = $this->remember($restaurant, $date, $partySize, $this->guard(
                    fn () => $provider->getSlots($restaurant, $date, $partySize),
                ));
            } catch (Throwable $e) {
                report($e);
                $results[$id] = SlotResult::failed('failed');
                unset($toAsk[$id]);
            }
        }

        foreach ($this->askInParallel($toAsk) as $id => $result) {
            $results[$id] = $this->remember($toAsk[$id]['restaurant'], $date, $partySize, $result);
        }

        // Same order as asked.
        $ordered = [];

        foreach ($restaurants as $restaurant) {
            $ordered[$restaurant->id] = $results[$restaurant->id];
        }

        return $ordered;
    }

    /**
     * The adapter to ask, or null after putting the reason there is none
     * into $results.
     *
     * @param  array<int, array{available: bool, slots: list<string>, error: ?string}>  $results
     */
    private function providerFor(Restaurant $restaurant, array &$results): ?AvailabilityProvider
    {
        $kind = $restaurant->booking_provider;
        $error = match (true) {
            $kind === BookingProvider::Phone => 'phone',
            ! $kind->isOnline() => 'no_online_booking',
            default => null,
        };

        $provider = $error === null ? $this->provider($kind) : null;

        if ($error === null && $provider === null) {
            $error = 'provider_unsupported';
        }

        if ($error !== null) {
            $results[$restaurant->id] = SlotResult::failed($error);
        }

        return $provider;
    }

    /**
     * @param  array<int, array{restaurant: Restaurant, provider: HttpAvailabilityProvider, request: array{url: string, query: array<string, scalar>}}>  $toAsk
     * @return array<int, array{available: bool, slots: list<string>, error: ?string}>
     */
    private function askInParallel(array $toAsk): array
    {
        if ($toAsk === []) {
            return [];
        }

        try {
            $responses = Http::pool(function (Pool $pool) use ($toAsk) {
                foreach ($toAsk as $id => $ask) {
                    $ask['provider']->configure($pool->as((string) $id))
                        ->get($ask['request']['url'], $ask['request']['query']);
                }
            });
        } catch (Throwable $e) {
            report($e);

            return array_map(fn () => SlotResult::failed('failed'), $toAsk);
        }

        $results = [];

        foreach ($toAsk as $id => $ask) {
            $response = $responses[(string) $id] ?? null;

            $results[$id] = $response instanceof Response
                ? $this->guard(fn () => $ask['provider']->read($response, $ask['restaurant']))
                : SlotResult::failed('unreachable');
        }

        return $results;
    }

    /**
     * At most one request per restaurant per minute to its platform.
     */
    private function mayAsk(Restaurant $restaurant): bool
    {
        $key = 'availability-ask:'.$restaurant->id;

        if (RateLimiter::tooManyAttempts($key, 1)) {
            return false;
        }

        RateLimiter::hit($key, 60);

        return true;
    }

    /**
     * Keep real answers for 5 minutes. Errors are not kept, so a hiccup
     * doesn't hide free tables for long.
     *
     * @param  array{available: bool, slots: list<string>, error: ?string}  $result
     * @return array{available: bool, slots: list<string>, error: ?string}
     */
    private function remember(Restaurant $restaurant, CarbonInterface $date, int $partySize, array $result): array
    {
        if ($result['error'] === null) {
            Cache::put($this->cacheKey($restaurant, $date, $partySize), $result, now()->addMinutes(5));
        }

        return $result;
    }

    /** Changes with the booking details, so editing them asks again. */
    private function cacheKey(Restaurant $restaurant, CarbonInterface $date, int $partySize): string
    {
        $setup = md5($restaurant->booking_provider->value.'|'.$restaurant->booking_venue_id);

        return "availability:{$restaurant->id}:{$setup}:{$date->format('Y-m-d')}:{$partySize}";
    }

    /**
     * @param  callable(): array{available: bool, slots: list<string>, error: ?string}  $lookup
     * @return array{available: bool, slots: list<string>, error: ?string}
     */
    private function guard(callable $lookup): array
    {
        try {
            return $lookup();
        } catch (Throwable $e) {
            report($e);

            return SlotResult::failed('failed');
        }
    }

    /**
     * Where tapping a restaurant or a time goes: its booking page with the
     * choice filled in when the platform allows it, else its booking page,
     * else its website. Null when we have neither.
     */
    public function bookingLink(Restaurant $restaurant, CarbonInterface $date, string $time, int $partySize): ?string
    {
        $provider = $this->provider($restaurant->booking_provider);

        if ($provider instanceof PrefillsBookingLink) {
            $link = $provider->bookingLink($restaurant, $date, $time, $partySize);

            if ($link !== null) {
                return $link;
            }
        }

        return $restaurant->booking_url ?: $restaurant->website;
    }
}
