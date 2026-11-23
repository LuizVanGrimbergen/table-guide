<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Known cities
    |--------------------------------------------------------------------------
    |
    | Country and an approximate centre for every city in the collection.
    | The centre is used to bias Places lookups and to flag geocoding
    | matches that land suspiciously far away from the city.
    |
    */

    'cities' => [
        'Sydney' => ['country' => 'Australia', 'region' => 'AU', 'lat' => -33.8688, 'lng' => 151.2093, 'timezone' => 'Australia/Sydney'],
        'Melbourne' => ['country' => 'Australia', 'region' => 'AU', 'lat' => -37.8136, 'lng' => 144.9631, 'timezone' => 'Australia/Melbourne'],
        'Brisbane' => ['country' => 'Australia', 'region' => 'AU', 'lat' => -27.4698, 'lng' => 153.0251, 'timezone' => 'Australia/Brisbane'],
        'Canberra' => ['country' => 'Australia', 'region' => 'AU', 'lat' => -35.2809, 'lng' => 149.1300, 'timezone' => 'Australia/Sydney'],
        'Ghent' => ['country' => 'Belgium', 'region' => 'BE', 'lat' => 51.0543, 'lng' => 3.7174, 'timezone' => 'Europe/Brussels'],
        'Tokyo' => ['country' => 'Japan', 'region' => 'JP', 'lat' => 35.6762, 'lng' => 139.6503, 'timezone' => 'Asia/Tokyo'],
        'Johannesburg' => ['country' => 'South Africa', 'region' => 'ZA', 'lat' => -26.2041, 'lng' => 28.0473, 'timezone' => 'Africa/Johannesburg'],
        'Dallas' => ['country' => 'United States', 'region' => 'US', 'lat' => 32.7767, 'lng' => -96.7970, 'timezone' => 'America/Chicago'],
        'Warsaw' => ['country' => 'Poland', 'region' => 'PL', 'lat' => 52.2297, 'lng' => 21.0122, 'timezone' => 'Europe/Warsaw'],
    ],

    /*
    | Fake login for local development only: the login page shows a
    | "Continue as test user" button that signs in as this account.
    | Ignored outside APP_ENV=local.
    */
    'dev_login_email' => env('DEV_LOGIN_EMAIL'),

    'geocode' => [
        // A match further than this from the city centre is flagged needs_review.
        'max_distance_km' => 60,
        // Name similarity (0-100) below which a match is flagged needs_review.
        'min_name_similarity' => 60,
        // Pause between Places requests, in milliseconds.
        'throttle_ms' => 250,
    ],

];
