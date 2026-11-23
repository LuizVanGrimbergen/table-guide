<?php

use App\Http\Controllers\CollectionController;
use App\Http\Controllers\DevLoginController;
use App\Http\Controllers\FriendsController;
use App\Http\Controllers\InviteController;
use App\Http\Controllers\MenuLinkController;
use App\Http\Controllers\PlaceSearchController;
use App\Http\Controllers\RecommendationController;
use App\Http\Controllers\RestaurantController;
use App\Http\Controllers\SavedEntryController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/', [CollectionController::class, 'home'])->name('home');
    Route::redirect('dashboard', '/')->name('dashboard');

    Route::get('collection', [CollectionController::class, 'index'])->name('collection');
    Route::get('map', [CollectionController::class, 'map'])->name('map');
    Route::get('tonight', [CollectionController::class, 'tonight'])->name('tonight');
    Route::get('friends', [FriendsController::class, 'index'])->name('friends');
    Route::post('friends/invite', [FriendsController::class, 'invite'])->name('friends.invite');
    Route::delete('friendships/{friendship}', [FriendsController::class, 'destroy'])->name('friendships.destroy');
    Route::patch('sharing', [FriendsController::class, 'updateSharing'])->name('sharing.update');

    Route::post('restaurants/{restaurant}/recommend', [RecommendationController::class, 'store'])->name('recommendations.store');
    Route::post('recommendations/{recommendation}/save', [RecommendationController::class, 'save'])->name('recommendations.save');

    Route::get('places/search', PlaceSearchController::class)->middleware('throttle:30,1')->name('places.search');
    Route::post('restaurants', [RestaurantController::class, 'store'])->name('restaurants.store');
    Route::get('restaurants/{restaurant}', [RestaurantController::class, 'show'])->name('restaurants.show');
    Route::post('restaurants/{restaurant}/save', [SavedEntryController::class, 'store'])->name('entries.store');
    Route::post('restaurants/{restaurant}/menu-links', [MenuLinkController::class, 'store'])->name('menu-links.store');
    Route::delete('menu-links/{menuLink}', [MenuLinkController::class, 'destroy'])->name('menu-links.destroy');

    Route::patch('entries/{entry}', [SavedEntryController::class, 'update'])->name('entries.update');
    Route::delete('entries/{entry}', [SavedEntryController::class, 'destroy'])->name('entries.destroy');
});

// Invite links: guests are sent to log in or register, then come back here.
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('invite/{token}', [InviteController::class, 'show'])->name('invites.show');
    Route::post('invite/{token}/accept', [InviteController::class, 'accept'])->name('invites.accept');
    Route::post('r/{token}/save', [RecommendationController::class, 'savePublic'])->name('recommendations.public.save');
    // Guests land here after logging in or registering, back on the page with a Save button.
    Route::get('r/{token}/save', fn (string $token) => redirect()->route('recommendations.public', $token));
});

// Public recommendation page: no account needed.
Route::get('r/{token}', [RecommendationController::class, 'public'])->name('recommendations.public');

if (app()->isLocal()) {
    Route::get('dev-login', DevLoginController::class)->middleware('guest')->name('dev-login');
}

require __DIR__.'/settings.php';
