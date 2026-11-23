# The Collection

A private, mobile-first restaurant guide (installable PWA) for my godfather in Sydney. He keeps his own collection of restaurants, sends recommendations to friends and clients, and quickly decides where to eat tonight. Simplicity is the highest priority: every screen should be usable by someone who is not technical.

Read these before starting:

- `docs/original-brief.md`: the full original product brief.
- `docs/spec.md`: screens, flows and UX decisions that were already made in the design phase.
- `docs/design-system.md`: colours, type, spacing and components.
- `reference/prototype-mobile.dc.html`: the clickable design prototype. Its `<script>` holds the logic for filters, smart search, Tonight ranking and map pins. Port the behaviour, not the markup.
- `reference/google-map-prototype.html`: a working Google Maps page (markers, filters, Places lookups, caching).
- `data/restaurants.json`: his real list of 184 places, already structured.

## Stack

- Laravel 12, React starter kit (Inertia + React + TypeScript + Tailwind)
- MySQL
- Auth: starter kit auth (email + password); add magic link later
- Maps: Google Maps JavaScript API via `@vis.gl/react-google-maps`, Advanced Markers, Map ID
- Places: Google Places API (New), called only from Laravel (server key)
- PWA: `vite-plugin-pwa` (manifest, icons, offline cache of the collection)
- Hosting: Ploi on a Hostinger VPS

## Environment

```
GOOGLE_MAPS_BROWSER_KEY=   # exposed to the frontend as VITE_GOOGLE_MAPS_KEY, restricted by HTTP referrer
GOOGLE_MAP_ID=
GOOGLE_PLACES_SERVER_KEY=  # server only, never sent to the browser
```

Never commit keys. Never hardcode keys in components.

## Data model

- `users`: name, email, taste_tags (json, e.g. ["Italian","Pizza"]), default_visibility (private|friends|public)
- `restaurants`: shared facts only. name, city, area, country, address, lat, lng, google_place_id, website, phone, price_level, cuisine, occasion, verify_status (verified|needs_review|possibly_closed|closed), verified_at
- `saved_entries`: one per user per restaurant. user_id, restaurant_id, status (been|wish), favourite (bool), not_recommended (bool), rating (1..5 nullable), note (text, private by default), recommended_by, visited_on, visibility, good_for (json)
- `menu_links`: restaurant_id, kind (food|drinks|wine), url, source (verified|user), checked_at, maybe_stale
- `friendships`: user_id, friend_id, status (pending|accepted), invite_token
- `recommendations`: from_user_id, to_user_id nullable, public_token nullable, restaurant_id, message, saved_at
- `dinner_plans` and `plan_guests` (Phase 2)

Rules:

- Two users can rate the same restaurant independently: ratings and notes live on `saved_entries`, never on `restaurants`.
- Verification jobs may update `restaurants` but must never touch `saved_entries`.
- Policies: only the owner can edit their entries. Friends see only what visibility allows.

## Import

Write `php artisan collection:import data/restaurants.json {user_email}` that creates restaurants and saved entries for that user. Then `php artisan collection:geocode` that uses Places Text Search (name + area + city, maxResultCount 1, fields id and location), stores `google_place_id`, `lat`, `lng`, and flags uncertain matches as needs_review. Throttle it and make it resumable.

## Build order (MVP)

1. Install starter kit, Tailwind theme tokens from `docs/design-system.md`, fonts (Newsreader + Inter).
2. Migrations, models, factories, policies.
3. Import + geocode commands. Run them for my godfather's list.
4. Layout: bottom nav (Home, Collection, +, Map, Friends) on mobile, sidebar on desktop. More menu as a bottom sheet.
5. Collection screen with search, the four filter pills and cards (see spec).
6. Restaurant detail: View Menu, Book, Directions, Recommend, Been/Wishlist toggle, stars, private note, Plan a dinner.
7. Map tab with Google Maps and coloured pins.
8. Tonight screen.
9. Add restaurant flow with Places autocomplete and duplicate check.
10. Friends: invite link, accept, recommendations inbox, save to wishlist.
11. Sharing: WhatsApp link and a public recommendation page (Blade, Open Graph tags for a nice preview).
12. Calendar: Google Calendar template link and a downloadable `.ics`. Proposed vs Confirmed.
13. PWA manifest, icons, offline cache.

## Honesty rules (do not break)

- Never invent menus, dishes, prices or available times.
- No live availability: Book opens the restaurant's own booking page.
- A calendar event is never a reservation. Show Proposed and Confirmed differently.
- Show Google attribution where Places data is shown.

## Code style

- TypeScript strict, small components, one page component per screen in `resources/js/pages`.
- Form requests for validation, policies for authorisation, actions/services for Google calls.
- Pest tests for policies, import and the filter/search logic.
- Mobile first. Tap targets at least 44px. Body text 16px.
