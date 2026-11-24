<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // How a place takes bookings is a shared fact about the restaurant.
        Schema::table('restaurants', function (Blueprint $table) {
            $table->string('booking_provider', 16)->default('none')->after('phone');
            $table->string('booking_venue_id')->nullable()->after('booking_provider');
            $table->string('booking_url', 2048)->nullable()->after('booking_venue_id');
        });

        // Which places someone wants in their table checker is personal.
        Schema::table('saved_entries', function (Blueprint $table) {
            $table->boolean('in_checker')->default(false)->after('not_recommended');
        });
    }

    public function down(): void
    {
        Schema::table('saved_entries', function (Blueprint $table) {
            $table->dropColumn('in_checker');
        });

        Schema::table('restaurants', function (Blueprint $table) {
            $table->dropColumn(['booking_provider', 'booking_venue_id', 'booking_url']);
        });
    }
};
