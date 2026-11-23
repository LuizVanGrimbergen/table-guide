<?php

namespace App\Console\Commands;

use App\Actions\GeocodeRestaurant;
use App\Models\Restaurant;
use App\Services\GooglePlaces;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;

#[Signature('collection:geocode
    {--limit= : Stop after this many restaurants}
    {--city= : Only restaurants in this city}
    {--retry : Also retry places that were looked up before but have no place id}')]
#[Description('Look up Google place ids and locations for restaurants (throttled, resumable)')]
class GeocodeCollectionCommand extends Command
{
    public function handle(GooglePlaces $places, GeocodeRestaurant $geocode): int
    {
        if (! $places->isConfigured()) {
            $this->error('Set GOOGLE_PLACES_SERVER_KEY in .env first.');

            return self::FAILURE;
        }

        $query = Restaurant::query()
            ->whereNull('google_place_id')
            ->when(! $this->option('retry'), fn ($q) => $q->whereNull('geocoded_at'))
            ->when($this->option('city'), fn ($q, $city) => $q->where('city', $city))
            ->orderBy('id');

        $total = (clone $query)->count();
        $limit = $this->option('limit') ? (int) $this->option('limit') : $total;
        $todo = min($total, $limit);

        if ($todo === 0) {
            $this->info('Nothing to geocode.');

            return self::SUCCESS;
        }

        $this->info("Geocoding {$todo} of {$total} restaurants.");
        $throttle = (int) config('collection.geocode.throttle_ms') * 1000;
        $counts = [];
        $flagged = [];
        $done = 0;

        foreach ($query->lazyById(50) as $restaurant) {
            if ($done >= $todo) {
                break;
            }

            try {
                $result = $geocode->handle($restaurant);
            } catch (RequestException|ConnectionException $e) {
                // Stop without marking this row, so the next run resumes here.
                $this->newLine();
                $this->error("Stopped at \"{$restaurant->name}\": {$e->getMessage()}");
                $this->line("{$done} done. Run the command again to continue.");

                return self::FAILURE;
            }

            $done++;
            $counts[$result['outcome']] = ($counts[$result['outcome']] ?? 0) + 1;

            if ($result['reason'] !== null) {
                $flagged[] = [$restaurant->name, $restaurant->city, $result['outcome'], $result['reason']];
            }

            $this->line(sprintf('  [%d/%d] %-10s %s, %s', $done, $todo, $result['outcome'], $restaurant->name, $restaurant->city));

            if ($done < $todo) {
                usleep($throttle);
            }
        }

        $this->newLine();
        $this->table(['Outcome', 'Count'], collect($counts)->map(fn ($n, $k) => [$k, $n])->values()->all());

        if ($flagged !== []) {
            $this->warn('Flagged for review:');
            $this->table(['Name', 'City', 'Outcome', 'Why'], $flagged);
        }

        return self::SUCCESS;
    }
}
