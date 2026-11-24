<?php

namespace App\Enums;

/** What the table checker shows for one restaurant at the chosen time. */
enum AvailabilityStatus: string
{
    // The requested time is free.
    case Available = 'available';
    // Not the requested time, but other times within 90 minutes.
    case Alternative = 'alternative';
    // The platform answered: nothing within 90 minutes.
    case Full = 'full';
    // We couldn't find out (phone only, not set up, error, ...).
    case Unknown = 'unknown';
}
