# PROJECT: THE COLLECTION — A Personal Restaurant & Friends PWA

## Your Role

Act as an award-winning senior product designer, UX/UI specialist and full-stack engineer.

I want you to design and build an exceptional, mobile-first restaurant web application that can be installed as a Progressive Web App (PWA).

This is a personal project for my godfather, who is passionate about restaurants, gastronomy, discovering great places and sharing recommendations with friends and clients.

I want to create something genuinely useful and enjoyable, not another generic restaurant directory.

**The vision: A beautifully designed personal restaurant guide that combines a private restaurant collection, trusted recommendations between friends, wishlists, reservations and calendar planning.**

Think of the elegance of a premium food magazine combined with the practicality of Google Maps and the personal connection of sharing recommendations with friends.

The experience should be premium, intuitive, warm and extremely easy to use.

Simplicity is the highest priority.

---

## 1. Personal Restaurant Collection

Every user has their own restaurant collection.

Restaurants can be organized into:

**Been There**
- Restaurants personally visited.
- Personal rating from 1–5 stars.
- Personal notes and recommendations.
- Optional photos and visit dates.
- Favourite status.
- Cuisine tags.

**Wishlist**
- Restaurants the user wants to try.
- Optional notes explaining why.
- Who recommended the restaurant.
- Priority or favourite indicator.
- One-tap move from Wishlist to Been There.

**Favourites**
- A special collection of the user's absolute favourite restaurants.
- Easy to share with friends.

A restaurant should be easy to find, add, edit and organize.

Provide both elegant photo cards and a highly practical compact list view.

## 2. Restaurant Details

Every restaurant should have its own beautiful detail page.

Information:
- Restaurant name.
- Photos.
- Address, city and country.
- Cuisine category.
- Official website.
- Telephone number.
- Opening hours, when available.
- Price range.
- Personal rating.
- Personal notes.
- Wishlist / Visited status.
- Favourite indicator.
- Map and directions.
- Reservation options.
- Friends' ratings, when shared.

### Important: View Menu Button

Add a clear **"View Menu"** button on each restaurant's detail page.

This should:
- Open the restaurant's official food menu.
- Support an official menu webpage or PDF.
- Optionally distinguish Food Menu, Drinks Menu and Wine List.
- Only show menu links when verified or manually provided.
- Allow users to submit or update a menu URL.
- Clearly indicate when a menu link may be outdated.

Do not fabricate food menus, prices or dishes.

Place the Menu button logically alongside Book a Table, Directions and Share.

The detail page should remain uncluttered.

## 3. Cuisine Types & Intelligent Filtering

Support cuisine categories such as:

Italian, Greek, Modern Australian, Chinese, Japanese, French, Belgian, Thai, Indian, Spanish, Vietnamese, Korean, Mediterranean, Middle Eastern, Seafood, Steakhouse, Contemporary and Fusion.

Allow custom categories and multiple tags per restaurant.

Powerful but simple search and filters:
- City and country.
- Cuisine.
- Personal rating.
- Wishlist or Visited.
- Favourites.
- Price category.
- Friends' recommendations.
- Availability, when supported.

The search experience should feel instant and natural.

## 4. My Circle — Private Restaurant Community

This is one of the most important features.

My godfather wants to connect with a small group of trusted friends who also love discovering restaurants.

Create a feature called **My Circle**.

Users can:
- Invite friends using a link.
- Accept or decline invitations.
- View restaurants recommended by friends.
- Discover friends' favourite restaurants.
- View ratings that friends have chosen to share.
- View shared wishlists.
- Save friends' recommendations into their own collection.
- Create private groups for different friend circles.

Example:

My godfather loves Italian restaurants.

His friend Luiz also loves Italian food and pizza.

When my godfather visits an excellent Italian restaurant, he can send Luiz a personal recommendation:

"Luiz, I've been to this amazing Italian restaurant. I know you love pizza — you should really try this one!"

The message includes:
- Restaurant name.
- Restaurant photo.
- Location.
- Cuisine.
- My godfather's rating.
- Optional personal message.
- A link to directions, menu or reservations.

The recipient can instantly save it to their wishlist.

This sharing should work inside the app and through WhatsApp or the phone's native share sheet.

Recipients without an account should still be able to open a public recommendation link.

### Friends' Cuisine Preferences

Allow users to optionally save preferences such as:
- Luiz loves Italian and pizza.
- Peter likes seafood.
- Sophie prefers Japanese.
- Marc enjoys fine dining.

These are personal preferences that people can choose to share.

When sharing a restaurant, make it easy to choose the relevant friends.

Consider subtle suggestions based on explicitly shared preferences, without implementing complex or intrusive recommendation algorithms.

### Ratings & Privacy

Each user controls whether their ratings are:
- Private.
- Visible to friends.
- Public.

Wishlist visibility should also be configurable.

Private notes should remain private by default.

A user's restaurant collection must never be editable by someone else without explicit permission.

## 5. Recommend a Restaurant

Create a very fast **Recommend** action.

The user should be able to:

1. Search for a restaurant.
2. Tap Recommend.
3. Choose one or several friends.
4. Optionally add a personal message.
5. Send it instantly.

The experience should feel like sharing a contact or photo, not completing a complicated form.

Also support beautiful curated collections such as:
- Best Italian Restaurants in Sydney.
- My Favourite Restaurants in Antwerp.
- Where to Eat in Paris.
- Restaurants I Recommend to Clients.

These collections should be shareable through a clean public link.

## 6. Find a Table Tonight

Add an extremely useful feature called **Find a Table**.

The idea:

My godfather opens the app and asks:

"Where can we get a table tonight for four people?"

He should be able to select:
- City or current area, with permission.
- Date.
- Preferred time or time range.
- Number of guests.
- Cuisine.
- Optional price range.
- My restaurants / Wishlist / Friends' suggestions / All restaurants.

The app should help him discover restaurants with suitable reservations.

Investigate integrations such as OpenTable, TheFork and Resy.

Important:
- Only display real-time availability if a supported provider actually confirms it.
- Do not invent available times.
- Clearly distinguish booking links from verified availability.
- Support external reservation providers when direct booking APIs are unavailable.
- Never indicate a reservation is confirmed until confirmation is received.

The goal is to make it quick to go from deciding where to eat to opening the correct booking page.

## 7. Calendar Integration — Essential New Feature

I want the restaurant app to integrate naturally with personal calendars.

Support:
- Google Calendar.
- Apple Calendar.
- Outlook Calendar where feasible.

### Add Dinner to Calendar

On a restaurant detail page, include an **Add to Calendar** action.

The user can select:
- Date.
- Time.
- Number of guests.
- Friends attending.
- Optional notes.

The calendar event should contain:
- Restaurant name.
- Address.
- Google Maps or Apple Maps link.
- Restaurant website.
- Reservation details, if confirmed.
- Optional invitation to friends.

### Dinner Planning With Friends

A particularly nice feature would be:

1. My godfather finds an Italian restaurant.
2. He selects two or three friends.
3. He proposes a date and time.
4. Friends receive an invitation or shareable link.
5. They can indicate whether they can attend.
6. After booking, the dinner can be added to their calendars.

Keep this lightweight. It should not become an entire event-management platform.

### Calendar Technical Requirements

Use native calendar event creation or downloadable `.ics` files as a reliable baseline.

Investigate Google Calendar and Microsoft calendar integrations for enhanced features.

Use appropriate permissions and OAuth where necessary.

Never access private calendars without permission.

Distinguish between a proposed dinner and a confirmed reservation. Adding an event must not be treated as booking a table.

## 8. Map View

Provide an elegant interactive map.

Users should be able to see:
- Their saved restaurants.
- Their wishlist.
- Their favourites.
- Restaurants recommended by friends, when shared.

Use distinct, tasteful markers or filters.

Tapping a marker opens restaurant details.

Include one-tap directions through Google Maps or Apple Maps.

The map should be practical and not visually overwhelming.

## 9. Restaurant Verification

Restaurant information changes.

Investigate integration with Google Places API or another reliable provider.

The app should be able to:
- Identify potentially permanently closed restaurants.
- Detect possible address changes.
- Detect restaurant name changes.
- Check whether saved website links still work.
- Track when restaurant details were last verified.

Show subtle statuses:
- Verified.
- Needs review.
- Possibly closed.
- Permanently closed, when reliably confirmed.

Allow manual corrections.

Never silently overwrite personal notes or ratings.

Design scheduled verification as an optional background feature, taking API cost and limitations into account.

## 10. Simple Restaurant Entry

Adding restaurants must be effortless.

Ideal flow:

1. Tap the prominent + button.
2. Search by restaurant name or paste a supported restaurant link.
3. Select the correct restaurant.
4. Automatically fill available details.
5. Choose Been There or Wishlist.
6. Optionally add rating and notes.
7. Save.

Support manual entry, batch import from CSV and backup/export.

Detect possible duplicate entries.

The entire process should ideally take only a few seconds.

## 11. Home Screen Design

The homepage should feel like opening a beautiful personal food guide.

Suggested layout:

At the top:
- Personal greeting.
- Beautiful editorial heading.
- Large search field.
- Clear Add Restaurant button.

Then four primary actions:

**My Restaurants**
Browse his collection and ratings.

**Wishlist**
Discover places he wants to try.

**Find a Table**
Search for somewhere to eat tonight.

**My Circle**
Discover and share recommendations with friends.

Below:
- Recently added restaurants.
- Personal favourites.
- Recent recommendations from friends.

Avoid overwhelming the user with statistics or dashboard widgets.

## 12. Navigation & Menu Button

Create a very clear, polished navigation system.

For mobile, consider a bottom navigation with:

**Home | Collection | Explore | Friends**

Use a central or floating + button for adding restaurants.

Add a clearly recognizable **Menu / More** button for secondary sections such as:
- Calendar / Dinner Plans.
- Shared Collections.
- Profile.
- Settings.
- Privacy.
- Import / Export.
- Help.

The navigation menu should open a tasteful, simple mobile sheet or drawer.

Do not create excessive navigation layers or hide frequently used actions.

On desktop, adapt navigation to a clean sidebar or header.

Importantly, distinguish the app's navigation menu from the restaurant's own **View Menu** button.

## 13. Visual Design Direction

I want a refined, premium, editorial European aesthetic.

Think:
- Independent culinary magazines.
- Boutique restaurant guides.
- Contemporary hospitality design.
- Luxury lifestyle publications.
- Elegant travel journals.

### Visual Style

Use:
- Warm off-white or ivory backgrounds.
- Deep charcoal typography.
- Muted olive green, espresso or burgundy as accents.
- Refined serif typography for editorial titles.
- Highly readable sans-serif for all interface elements.
- Beautiful restaurant photography.
- Generous whitespace.
- Excellent alignment.
- Subtle borders and shadows.
- Small, deliberate microanimations.

The product must feel sophisticated and timeless.

Avoid:
- Generic SaaS dashboard layouts.
- Bright gradients.
- Too many coloured cards.
- Excessive statistics.
- Oversized icons.
- Overdesigned navigation.
- Clutter.
- Unnecessary gamification.
- Features that make the interface confusing.

Focus on beautiful usability.

## 14. Mobile-First PWA

This application will primarily be used on smartphones.

Requirements:
- Installable on iPhone and Android.
- PWA manifest and suitable app icons.
- Responsive desktop experience.
- Fast loading.
- Touch-friendly interactions.
- Comfortable tap targets.
- Great typography on small screens.
- Appropriate caching and offline support.
- Clear error and empty states.
- Accessible navigation.
- Persistent cloud database.
- Secure authentication.
- Notifications with opt-in permission.
- Proper protection of private restaurant data.

Consider notification scenarios such as:
- A friend has recommended a restaurant.
- Someone invited you to dinner.
- A shared dinner plan has changed.

Keep notifications useful and optional.

## 15. Technical Architecture

Choose a modern, maintainable technology stack.

A reasonable starting point:
- Next.js.
- TypeScript.
- Tailwind CSS.
- Supabase for authentication and database.
- PostgreSQL.
- An appropriate map provider.
- Restaurant information API.
- PWA support.

However, make architecture decisions based on the requirements rather than blindly following this list.

Design the database to support:
- Users.
- Restaurants.
- Personal saved restaurant entries.
- Ratings and notes.
- Wishlists.
- Friendship connections.
- Private friend groups.
- Shared collections.
- Recommendations.
- Dinner plans.
- Calendar integrations.
- Restaurant verification status.

Ensure users can rate the same restaurant independently.

Implement appropriate database access controls.

Store private API credentials securely on the server.

Respect external providers' API terms, data storage rules and billing limits.

Initial interface language: English, with support for Dutch later.

## 16. MVP vs Future Features

This is very important.

Do not try to build every idea at once.

### MVP — Build First

Prioritize:
1. Beautiful responsive design.
2. Authentication and persistent database.
3. Personal restaurant collection.
4. Wishlist and visited status.
5. Personal ratings and notes.
6. Cuisine and city filters.
7. Add restaurant flow.
8. Restaurant details and menu links.
9. Friends and direct recommendations.
10. Sharing via WhatsApp or public links.
11. Basic calendar event export.
12. Installable PWA.

### Phase 2

Add:
- Private friend groups.
- Shared restaurant collections.
- Interactive map.
- Dinner planning with friends.
- Enhanced calendar integrations.
- External reservation links and provider integrations.
- Restaurant verification automation.

### Phase 3

Consider:
- Verified live booking availability.
- Personalized discovery suggestions.
- Opt-in notifications.
- Advanced preference-based recommendations.

Build in a way that allows future features without compromising the simplicity of the initial app.

## 17. What I Want From You

Start by designing the product as an experienced product designer.

Think through how my godfather would actually use this app during a normal week.

Examples:
- He visits a restaurant and rates it.
- He hears about a new restaurant and adds it to his wishlist.
- A client asks for a recommendation.
- He wants to send an Italian restaurant to Luiz.
- He checks where four people could eat tonight.
- He finds a restaurant, opens its menu and plans a dinner.
- He shares a favourite restaurant with his group of friends.
- He checks which restaurants a friend has recommended.

Design the complete user experience around these situations.

### Deliverables

1. A clear product concept and visual identity.
2. An information architecture and navigation plan.
3. High-quality mobile screen designs.
4. Responsive desktop designs.
5. Main user journeys.
6. A coherent design system.
7. A prioritized implementation plan.
8. A functional interactive prototype with realistic sample data.

If you have access to a coding environment, implement the prototype rather than only describing it.

Make the interactions work. Buttons, navigation, filters, ratings and wishlist controls should not be decorative.

Use realistic placeholder data for features that need external APIs, but label simulated data clearly and never pretend that live reservations, connected calendars or verification checks are already functional.

### Final Design Principle

**The Collection should feel like having your own private Michelin-style restaurant guide, your most trusted food-loving friends and your dinner plans — all beautifully organized in one pocket-sized app.**

Make it personal, effortless, sophisticated and genuinely fun.

I want something special for my godfather, not a generic restaurant website.

Be creative, challenge my ideas when necessary, simplify wherever possible and make the design feel exceptional.