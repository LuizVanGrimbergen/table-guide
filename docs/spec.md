# Screens and UX decisions

These were decided and tested in the clickable prototype (`reference/prototype-mobile.dc.html`).

## Navigation
Bottom nav: Home, Collection, + (raised, centre), Map, Friends. Top right: a labelled "More" button opening a bottom sheet (Favourites, Wishlist, Tonight, My Circle, Dinner plans, Settings, Import/Export, Help). The app menu is always called "More"; the restaurant menu is always "View Menu". They never share an icon.

## Home (top to bottom)
1. Search field + "+ Add" button. Typing jumps to the Collection with results.
2. "Where to tonight?" large olive button, opens Tonight.
3. "Or browse by occasion": six tiles in a 2 column grid with counts (Business lunch, Special occasions, Casual, Bars, Suburban, Favourites). Tapping opens the Collection pre filtered (Sydney, recommended only).
4. Favourites: horizontal row of cards.
5. Map preview card, opens the Map tab.
6. From your circle: friend recommendations with "Save to wishlist".
No big headline, no statistics, no dashboard widgets.

## Collection
- Title, search field.
- Smart search: words map to filters. "italian lunch surry hills" becomes Italian + Business lunch + Surry Hills. Show a line "Showing: Surry Hills · Italian · Business lunch". Keyword table is in the prototype (`TC_KEYS`, `tcParse`).
- One row of four pill buttons: [Sydney ▾] [Occasion ▾] [Been & wishlist ▾] [More ▾]. A pill is black when active.
- Tapping a pill opens a bottom sheet with a short single choice list: large rows, one line hint, count, check mark. Choosing closes the sheet immediately (no Apply button).
- More sheet: Good for (Groups, Clients, Wine list, Views, For two, Drinks), Cuisine, and a switch "Hide places I don't recommend".
- Under the pills: "56 places", a Reset button only when something is filtered, card/list toggle.
- Card: colour block (later a photo), status badge, name, his note in large italic as the hero, area. No tag chips on cards.
- List view: status dot, name, area, status label.
- Show 20, then "Show more".

## Restaurant detail
Hero image, heart (favourite), kicker (status · occasion), name, area, tags. Four action buttons: View Menu (primary, dark), Book, Directions, Recommend. Card with Been there / Wishlist toggle, five stars, private notes. "Plan a dinner here". Details list (area, website, address, phone, hours, verification status).
- View Menu sheet: only verified or user added links, "may be outdated" badge, field to add a link. Never guess.
- Book sheet: opens booking page, says nothing is booked until the restaurant confirms.
- Recommend sheet: friends list with taste hints, "Good match" badge when the friend's taste tags match the cuisine, optional message, Send in app, WhatsApp, public link.
- Plan a dinner sheet: date, time, Proposed / Booking confirmed, Google Calendar link, .ics download.

## Tonight ("Dinner tonight")
- Date line, title.
- "How many people?": six large buttons 2, 3, 4, 5, 6, 8+.
- "What kind of evening?": five large rows with hint and count: Business or clients, Something special, Easy and relaxed, Close to home, Just drinks.
- "His top picks": top 5 from his own Sydney places that are Been there and not "not recommended". Ranking: favourite +2, good for groups +3 when 6 or more guests, has a note +1. Each pick: rank number, name, area, note, buttons Book a table and Directions (Google Maps directions URL).
- "See all N in the Collection".
- Footnote: Book opens the restaurant's own page. Live times come later.

## Map
Full screen Google Map. Top: city name and count, Filters button, locate me. Status chips: All, Been there, Wishlist, Favourites. Pins: olive = been, outlined burgundy = wishlist, burgundy = favourite, grey = not recommended, first letter as glyph. Tapping a pin shows a bottom card with status, name, area, his note, Directions and Details. Uses the same filters as the Collection.

## Friends (My Circle)
Friends row with taste tags, "Recommended to you" feed with Save to wishlist, friends' favourites, "Invite by link".

## Data mapping from his list
- "to explore" = wishlist
- "stay away", "bad", "overrated", "not impressed" = not_recommended
- "best", "amazing", "must", "LOVE", "highly recommended" = favourite
- His section "Fine dining/special occasions" = occasion special_occasions
- Area and cuisine are only filled where he wrote them. Geocoding fills the rest.
