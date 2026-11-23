<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('the fake login does not exist outside local development', function () {
    User::factory()->create(['email' => 'test@example.com']);
    config(['collection.dev_login_email' => 'test@example.com']);

    // The test suite runs with APP_ENV=testing, so the route is never registered.
    $this->get('/dev-login')->assertNotFound();
    $this->assertGuest();
});
