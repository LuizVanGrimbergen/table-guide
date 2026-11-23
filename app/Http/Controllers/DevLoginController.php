<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;

/**
 * Fake login for local development. The route is only registered when
 * APP_ENV=local, and this check stops it even if that ever changes.
 */
class DevLoginController extends Controller
{
    public function __invoke(): RedirectResponse
    {
        abort_unless(app()->isLocal(), 404);

        $email = config('collection.dev_login_email');
        $user = $email ? User::where('email', $email)->first() : null;

        abort_if($user === null, 404, 'Set DEV_LOGIN_EMAIL in .env to an existing user.');

        Auth::login($user, remember: true);
        request()->session()->regenerate();

        return redirect()->route('home');
    }
}
