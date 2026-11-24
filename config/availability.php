<?php

/*
 * Free-table lookups on the restaurants' own booking platforms.
 * See app/Services/Availability.
 */
return [
    // Seconds to wait for one platform before giving up on that restaurant.
    'timeout' => 5,

    // The platforms' booking widgets are made for browsers, so we ask as one.
    'user_agent' => env(
        'AVAILABILITY_USER_AGENT',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    ),

    'sevenrooms' => [
        // TODO(availability): the booking widget's availability URL, without
        // the "?..." part. How to find it: app/Services/Availability/SevenRoomsProvider.php.
        // Empty means not configured: lookups answer "unknown".
        'endpoint' => env('SEVENROOMS_AVAILABILITY_URL'),
    ],
];
