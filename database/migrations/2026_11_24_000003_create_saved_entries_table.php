<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('saved_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->string('status', 16)->default('wish');
            $table->boolean('favourite')->default(false);
            $table->boolean('not_recommended')->default(false);
            $table->unsignedTinyInteger('rating')->nullable();
            $table->text('note')->nullable();
            $table->string('recommended_by')->nullable();
            $table->date('visited_on')->nullable();
            $table->string('visibility', 16)->default('private');
            $table->json('good_for')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'restaurant_id']);
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_entries');
    }
};
