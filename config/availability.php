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
        // The booking widget's availability URL, read from Bistecca's booking
        // page on 24 Nov 2026. See app/Services/Availability/SevenRoomsProvider.php.
        // Set SEVENROOMS_AVAILABILITY_URL to an empty value to switch lookups off.
        'endpoint' => env('SEVENROOMS_AVAILABILITY_URL', 'https://www.sevenrooms.com/api-yoa/availability/ng/widget/range'),
    ],

    'nowbookit' => [
        // Read from a Now Book It booking page on 24 Nov 2026; the venue id is
        // added to the end. See app/Services/Availability/NowBookItProvider.php.
        'endpoint' => env('NOWBOOKIT_AVAILABILITY_URL', 'https://api.nowbookit.com/bookings/get-schedule/venue'),
    ],
];
