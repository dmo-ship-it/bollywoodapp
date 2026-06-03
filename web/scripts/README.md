# Database Seeding Scripts

## Seed Fake Data

This script generates realistic fake user data for testing and demonstration.

### What Gets Created

- **25 users** with diverse profiles (different cities, languages, preferences)
- **500+ ratings** across your existing movies
- **250+ follow relationships** between users
- **200+ watchlist items** for discovery
- **100+ badges** automatically awarded based on user activity

### Prerequisites

1. You must have **movies already in your database**. The script fetches movies and uses them for ratings.
2. Set environment variables:

```bash
export NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
```

### Running the Script

From the web directory:

```bash
node scripts/seed-fake-data.js
```

Or with npm:

```bash
npm run seed
```

(Add this to your `package.json` scripts section if not already there)

### What You'll See

The script will:
1. ✅ Fetch all movies from your database
2. ✅ Create 25 user profiles with realistic details
3. ⭐ Generate ratings (favoring 4-5 stars like real users)
4. 👥 Create follow relationships between users
5. 🔖 Add watchlist items
6. 🏆 Automatically award badges based on activity

### After Seeding

Your platform will have:
- **Community tab** with diverse user profiles to browse
- **Rankings** showing actual top-rated films
- **Following feed** with activity from multiple users
- **Badges** on various profiles
- **Discovery** with real social proof

### Testing Users

The script creates users with email pattern: `user1@bollyapp.test` through `user25@bollyapp.test`

To actually log in:
- Use Supabase's test email functionality
- Or create custom auth for testing
- Or comment out the email validation in auth flow

### Clearing Fake Data

To start fresh and remove all seed data:

```sql
-- WARNING: This will delete ALL user data!
DELETE FROM user_badges;
DELETE FROM user_comparisons;
DELETE FROM user_watchlist;
DELETE FROM wah_wahs;
DELETE FROM community_votes;
DELETE FROM community_list_items;
DELETE FROM community_lists;
DELETE FROM community_posts;
DELETE FROM user_follows;
DELETE FROM user_reactions;
DELETE FROM user_profiles WHERE email LIKE '%bollyapp.test%';
```

### Customizing

Edit these variables in the script to adjust:

- `DISPLAY_NAMES` - User profile names
- `CITIES` - Geographic diversity
- `LANGUAGES` - Language preferences
- `numUsers` - How many users (currently 25)
- Rating distribution weights in `randomRating()`

### Notes

- Ratings use realistic weight distribution (more 4-5 stars than low ratings)
- Each user rates 15-55 random movies
- Some users follow 2-12 others
- Each user adds 3-11 films to watchlist
- Badges automatically awarded for: first rating, 10+ films, 25+ films, 50+ films, 5+ loves, 10+ loves

Enjoy exploring your populated platform! 🎬
