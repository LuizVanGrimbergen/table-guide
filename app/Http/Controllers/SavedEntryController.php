<?php

namespace App\Http\Controllers;

use App\Enums\EntryStatus;
use App\Http\Requests\UpdateSavedEntryRequest;
use App\Models\Restaurant;
use App\Models\SavedEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SavedEntryController extends Controller
{
    /** Save a restaurant he does not have yet to his wishlist. */
    public function store(Request $request, Restaurant $restaurant): RedirectResponse
    {
        $this->authorize('create', SavedEntry::class);
        $user = $request->user();

        SavedEntry::firstOrCreate(
            ['user_id' => $user->id, 'restaurant_id' => $restaurant->id],
            ['status' => EntryStatus::Wish, 'visibility' => $user->default_visibility],
        );

        return back()->with('toast', "{$restaurant->name} saved to your wishlist");
    }

    public function update(UpdateSavedEntryRequest $request, SavedEntry $entry): RedirectResponse
    {
        $data = $request->validated();

        // Rating a place means he has been there.
        if (! empty($data['rating'])) {
            $data['status'] = EntryStatus::Been->value;
        }

        $entry->update($data);

        return back();
    }

    public function destroy(Request $request, SavedEntry $entry): RedirectResponse
    {
        $this->authorize('delete', $entry);
        $name = $entry->restaurant->name;
        $entry->delete();

        return redirect()->route('collection')->with('toast', "{$name} removed from your collection");
    }
}
