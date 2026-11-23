# Screens and UX decisions

These were decided and tested in the clickable prototype (`reference/prototype-mobile.dc.html`).

## Navigation
Bottom nav: Home, My Places, + (raised, centre), Map, Friends. Top right: a labelled "More" button opening a bottom sheet (Favourites, Wishlist, Tonight, My Circle, Dinner plans, Settings, Import/Export, Help). The app menu is always called "More"; the restaurant menu is always "View Menu". They never share an icon.

## Home (top to bottom)
Home is kept deliberately quiet so it never overwhelms.
1. Search field. Results show right on Home as you type (all cities), so the phone keyboard stays open; "See all N in My Places" past 20. (Add lives in the navigation, not here.)
2. "Where to tonight?" large button, opens Tonight.
3. Favourites: horizontal row of small tiles (colour block with a cuisine line icon, name, cuisine · area), with "See all".
4. "Browse by occasion": a plain list of rows with counts (Business lunch, Special occasions, Casual, Bars, Suburban). Tapping opens the Collection pre filtered (Sydney, recommended only).
5. From your circle: at most two friend recommendations with "Save to wishlist", shown only when there are any.
No big headline, no statistics, no dashboard widgets, no map card (Map is in the navigation).

## My Places (route /collection)
The tab is called "My Places" (the app stays "The Collection").
- Title, search field. Smart search: words map to filters. "italian lunch surry hills" becomes Italian + Business lunch + Surry Hills. Show a line "Showing: Surry Hills · Italian · Business lunch". Keyword table is in the prototype (`TC_KEYS`, `tcParse`).
- The four filter pills, shared with the Map (`FilterBar`): [Where ▾] [Occasion ▾] [Been & wishlist ▾] [More ▾]. They wrap onto two lines so nothing is hidden off screen. Each pill shows its current choice and is cognac when active. Tapping opens a bottom sheet with a short single choice list (large rows, one line hint, count, check mark, line icons for occasions and cuisines); choosing closes it. More holds Hide places I don't recommend, Good for and Cuisine, with a "Show N places" button.
- Under the pills one line: "107 places · Italian · Business lunch" and a Clear button when anything is filtered.
- The list: compact rows (cuisine icon block, status dot, name, heart for favourites, his note in italic, cuisine). Grouped under area headings that stick while scrolling: areas with two or more places get their own heading, biggest first; single-place areas and places without an area share "Around Sydney" at the end, with the area on each row. Fewer than 8 results: one plain list. Within a group: favourites, been, wishlist, not recommended (dimmed), then A–Z.

## Restaurant detail
Hero image, heart (favourite), kicker (status · occasion), name, area, tags. Four action buttons: View Menu (primary, dark), Book, Directions, Recommend. Card with Been there / Wishlist toggle, five stars, private notes. "Plan a dinner here". Details list (area, website, address, phone, hours, verification status).
- View Menu sheet: only verified or user added links, "may be outdated" badge, field to add a link. Never guess.
- Book sheet: opens booking page, says nothing is booked until the restaurant confirms.
- Recommend sheet: friends list with taste hints, "Good match" badge when the friend's taste tags match the cuisine, optional message, Send in app, WhatsApp, public link.
- Plan a dinner sheet: date, time, Proposed / Booking confirmed, Google Calendar link, .ics download.

## Tonight ("Dinner tonight")
- Date line, title.
- "How many people?": seven large buttons 1, 2, 3, 4, 5, 6, 8+ (dinner alone counts).
- "What kind of evening?": five large rows with hint and count: Business or clients, Something special, Easy and relaxed, Close to home, Just drinks. Starts on Easy and relaxed, then remembers the last choice on that device.
- "Your top picks": top 5 from their own Sydney places that are Been there and not "not recommended". Ranking: favourite +2, good for groups +3 when 6 or more guests, has a note +1. Each pick: rank number, name, area, note, buttons Book a table and Directions (Google Maps directions URL).
- "See all N in the Collection".
- Footnote: Book opens the restaurant's own page. Live times come later.

## Map
Full screen Google Map, kept calm: one slim top bar, one chip row, swipe cards at the bottom.
- Top: the same four filter pills as My Places, floating over the map, and one line "11 places · Favourites · Italian  Clear". The Where pill holds the city and "Near me".
- Pins are teardrops in the status colour with the cuisine line icon inside (same icons as Home's Favourites): green = been, white with ochre outline = wishlist, wine = favourite, small grey = not recommended. Pins that sit too close together merge into a numbered bubble (wine ring when it holds favourites); tapping it zooms in. From street level every pin shows on its own.
- Bottom: a row of place cards to swipe through (cuisine icon block, status, distance when known, name, his note, cuisine · area, Directions). Swiping selects that pin and the map follows; tapping a pin brings its card to the middle; tapping a card opens the place. Order: nearest first when location is known, otherwise favourites, been, wishlist.
- "Near me" (in the Where sheet) uses the phone's live location, asked for only when he taps "Use my location", never stored or sent to the server. It then offers Anywhere in the city, Within 1, 2, 5 or 10 km with counts; the map then draws that circle around a "you are here" dot. Straight-line distance, not travel time. No home address is stored: friends use the app from wherever they are.
- The map zooms to fit the pins whenever the filters change; when nothing matches, a card offers "Show all places".
- Google's own points of interest are hidden through the Map ID's map style in Google Cloud Console, not in code.

## Friends (My Circle)
Friends row with taste tags, "Recommended to you" feed with Save to wishlist, friends' favourites, "Invite by link".

## Data mapping from his list
- "to explore" = wishlist
- "stay away", "bad", "overrated", "not impressed" = not_recommended
- "best", "amazing", "must", "LOVE", "highly recommended" = favourite
- His section "Fine dining/special occasions" = occasion special_occasions
- Area and cuisine are only filled where he wrote them. Geocoding fills the rest.
