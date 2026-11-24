<?php

namespace App\Services\Availability;

use App\Models\Restaurant;
use Carbon\CarbonInterface;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Shared plumbing for platforms asked over HTTP: timeout, browser
 * User-Agent and error handling. A platform only says where to ask
 * (request()) and how to read the answer (times()).
 */
abstract class HttpAvailabilityProvider implements AvailabilityProvider
{
    /**
     * Where to ask, or null while the endpoint has not been filled in.
     *
     * @return array{url: string, query: array<string, scalar>}|null
     */
    abstract public function request(Restaurant $restaurant, CarbonInterface $date, int $partySize): ?array;

    /**
     * The bookable times in the platform's answer, for that party and date.
     * Return null when the answer doesn't look like what we expect.
     *
     * @param  array<mixed>  $json
     * @return list<string>|null
     */
    abstract protected function times(array $json): ?array;

    public function getSlots(Restaurant $restaurant, CarbonInterface $date, int $partySize): array
    {
        $precheck = $this->precheck($restaurant, $date, $partySize);

        if ($precheck !== null) {
            return $precheck;
        }

        /** @var array{url: string, query: array<string, scalar>} $request */
        $request = $this->request($restaurant, $date, $partySize);

        try {
            $response = $this->configure(Http::createPendingRequest())
                ->get($request['url'], $request['query']);
        } catch (ConnectionException) {
            return SlotResult::failed('unreachable');
        }

        return $this->read($response, $restaurant);
    }

    /**
     * A ready answer when there is no point asking the platform, else null.
     *
     * @return array{available: bool, slots: list<string>, error: ?string}|null
     */
    public function precheck(Restaurant $restaurant, CarbonInterface $date, int $partySize): ?array
    {
        if (blank($restaurant->booking_venue_id)) {
            return SlotResult::failed('no_venue_id');
        }

        if ($this->request($restaurant, $date, $partySize) === null) {
            return SlotResult::failed('not_configured');
        }

        return null;
    }

    /** Timeout and browser User-Agent; also used for parallel requests. */
    public function configure(PendingRequest $request): PendingRequest
    {
        return $request
            ->timeout((int) config('availability.timeout', 5))
            ->connectTimeout(3)
            ->acceptJson()
            ->withUserAgent((string) config('availability.user_agent'));
    }

    /** @return array{available: bool, slots: list<string>, error: ?string} */
    public function read(Response $response, Restaurant $restaurant): array
    {
        if ($response->failed()) {
            Log::warning('Availability lookup failed', [
                'restaurant' => $restaurant->id,
                'provider' => static::class,
                'status' => $response->status(),
            ]);

            return SlotResult::failed('http_'.$response->status());
        }

        try {
            $json = $response->json();
            $times = is_array($json) ? $this->times($json) : null;
        } catch (Throwable) {
            $times = null;
        }

        if ($times === null) {
            Log::warning('Availability answer not understood', [
                'restaurant' => $restaurant->id,
                'provider' => static::class,
            ]);

            return SlotResult::failed('unexpected_response');
        }

        return SlotResult::found($times);
    }
}
