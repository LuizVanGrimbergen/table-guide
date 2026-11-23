<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Shared facts only. Ratings and notes live on saved_entries.
        Schema::create('restaurants', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('city')->index();
            $table->string('area')->nullable();
            $table->string('country')->nullable();
            $table->string('address')->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->string('google_place_id')->nullable()->unique();
            $table->string('website', 2048)->nullable();
            $table->string('phone', 64)->nullable();
            $table->unsignedTinyInteger('price_level')->nullable();
            $table->string('cuisine')->nullable()->index();
            $table->string('occasion', 32)->nullable()->index();
            $table->string('verify_status', 32)->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('geocoded_at')->nullable();
            $table->timestamps();

            $table->index(['name', 'city']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restaurants');
    }
};
