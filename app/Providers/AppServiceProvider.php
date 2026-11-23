<?php

namespace App\Providers;

use App\Services\GooglePlaces;
use App\Services\Tonight\ClaudeDinnerAi;
use App\Services\Tonight\DinnerAi;
use App\Services\Tonight\TonightAdvisor;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(DinnerAi::class, fn () => new ClaudeDinnerAi(
            config('services.anthropic.key'),
            config('services.anthropic.model'),
        ));
        $this->app->bind(TonightAdvisor::class, fn ($app) => new TonightAdvisor($app->make(DinnerAi::class)));
        $this->app->singleton(GooglePlaces::class, fn () => new GooglePlaces(config('services.google.places_server_key')));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
