<?php

namespace App\Enums;

enum VerifyStatus: string
{
    case Verified = 'verified';
    case NeedsReview = 'needs_review';
    case PossiblyClosed = 'possibly_closed';
    case Closed = 'closed';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
