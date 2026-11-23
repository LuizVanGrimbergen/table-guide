<?php

namespace App\Http\Controllers;

use App\Enums\MenuLinkSource;
use App\Http\Requests\StoreMenuLinkRequest;
use App\Models\MenuLink;
use App\Models\Restaurant;
use Illuminate\Http\RedirectResponse;

/**
 * Menu links are only ever real URLs that someone supplied or verified.
 * The app never writes menu content itself.
 */
class MenuLinkController extends Controller
{
    public function store(StoreMenuLinkRequest $request, Restaurant $restaurant): RedirectResponse
    {
        $restaurant->menuLinks()->create([
            ...$request->validated(),
            'source' => MenuLinkSource::User,
            'added_by' => $request->user()->id,
        ]);

        return back()->with('toast', 'Menu link added');
    }

    public function destroy(MenuLink $menuLink): RedirectResponse
    {
        $this->authorize('delete', $menuLink);
        $menuLink->delete();

        return back()->with('toast', 'Menu link removed');
    }
}
