<?php

namespace App\Http\Controllers;

use App\Http\Requests\TonightSuggestRequest;
use App\Services\Tonight\TonightAdvisor;
use Illuminate\Http\JsonResponse;

class TonightController extends Controller
{
    public function suggest(TonightSuggestRequest $request, TonightAdvisor $advisor): JsonResponse
    {
        return response()->json($advisor->suggest($request->user(), $request->answers()));
    }
}
