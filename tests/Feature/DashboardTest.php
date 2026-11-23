<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $this->get(route('home'))->assertRedirect(route('login'));
    }

    public function test_the_old_dashboard_url_goes_home()
    {
        $this->actingAs(User::factory()->create());

        $this->get(route('dashboard'))->assertRedirect('/');
    }
}
