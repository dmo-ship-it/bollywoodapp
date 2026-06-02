# 🌱 How to Seed Fake Data

Generate realistic fake user data to see your platform come alive with multiple users, ratings, badges, and community activity!

## Quick Start

### 1. Set Environment Variables

In your terminal (from the `web` directory), set your Supabase credentials:

```bash
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-key-here"
```

You can find these in your Supabase project settings:
- **NEXT_PUBLIC_SUPABASE_URL**: Settings → API → Project URL
- **SUPABASE_SERVICE_ROLE_KEY**: Settings → API → Service Role Key (keep this secret!)

### 2. Ensure You Have Movies

The seed script needs movies in your database to rate. If you don't have any:
- Either import a movie dataset
- Or add a few test movies manually to the `movies` table

### 3. Run the Seed Script

```bash
cd web
node scripts/seed-fake-data.js
```

Expected output:
```
🌱 Seeding fake data...

📽️  Fetching movies from database...
✓ Found 50 movies to use for seeding

✓ Creating 25 user profiles...
⭐ Creating ratings for each user...
✓ Created 650 total ratings

👥 Creating follow relationships...
✓ Created 245 follow relationships

🔖 Creating watchlist items...
✓ Created 185 watchlist items

🏆 Awarding badges...
✓ Awarded 120 badges

✨ Seeding complete!

📊 Summary:
   • Users created: 25
   • Total ratings: 650
   • Follow relationships: 245
   • Watchlist items: 185
   • Badges awarded: 120
```

## What Gets Created

### 👥 25 Diverse Users

Each with:
- Unique username (e.g., `CinephileXX42`)
- Display name (e.g., "Movie Maven")
- Location (Mumbai, Delhi, London, NYC, etc.)
- Languages (Hindi, Tamil, Telugu, Malayalam, English)
- Bio and watch goals

### ⭐ 650+ Film Ratings

Realistic distribution:
- 30% of ratings are 5-stars (loved)
- 35% are 4-stars (liked)
- 20% are 3-stars (okay)
- 10% are 2-stars (didn't like)
- 5% are 1-star (disliked)

### 👥 Follow Network

Users follow each other, creating:
- Social feed with activity from followed users
- Diverse follower counts (2-15 followers each)
- Network effects for discovery

### 🔖 Watchlists

Each user has 3-11 films they want to watch, creating:
- Discover page showing watchlist patterns
- Social proof ("215 people added this to watchlist")

### 🏆 Badges

Automatically awarded:
- First Watch (everyone)
- Film Fan (10+ ratings)
- Movie Buff (25+ ratings)
- Devoted Viewer (50+ ratings)
- Romantic Soul (5+ loves)
- Hopeless Romantic (10+ loves)

## Now What?

### View the Community

1. Go to `http://localhost:3000/community`
2. Click the **Communities** tab
3. You'll see fan cultures with real member counts
4. Click any community to see users who earned that badge

### Browse User Profiles

1. Go to `http://localhost:3000/people`
2. Click any user card
3. See their ratings, badges, watch streak
4. Follow them or view their full profile

### Check Rankings

1. Go to `http://localhost:3000/rankings`
2. See which movies are most loved
3. Toggle between "My Rankings" and "Global"

### Explore the Feed

1. Go to `http://localhost:3000/feed`
2. Switch to "👯 Following" tab
3. See activity from users you follow

### Discover Based on Taste

1. Go to `http://localhost:3000/taste-profile`
2. See taste recommendations based on similar users
3. Different users have different taste profiles

## Customizing the Seed

Edit `scripts/seed-fake-data.js`:

```javascript
// Change number of users
const numUsers = 25;  // ← change this

// Change profile display names
const DISPLAY_NAMES = [
  "Bollywood Buff",  // ← add or remove
  "Cinema Addict",
  // ...
];

// Change cities (for location diversity)
const CITIES = ["Mumbai", "Delhi", ...];

// Change language preferences
const LANGUAGES = [["Hindi", "English"], ...];
```

## Clearing the Data

To remove all seeded data and start fresh:

```bash
# From the Supabase console, run:
DELETE FROM user_badges WHERE user_id IN (
  SELECT user_id FROM user_profiles 
  WHERE email LIKE '%bollyapp.test%'
);
DELETE FROM user_profiles WHERE email LIKE '%bollyapp.test%';
```

Or delete everything user-related (be careful!):

```bash
DELETE FROM user_badges;
DELETE FROM user_reactions;
DELETE FROM user_profiles;
DELETE FROM user_follows;
DELETE FROM user_watchlist;
# ... etc for other user tables
```

## Testing with Real Auth

To actually log in with fake users, you have options:

### Option 1: Test Email Domains (Recommended)
Supabase allows test emails. Users are created with `user1@bollyapp.test` format:
- Supabase automatically allows test domains in dev
- You won't receive emails
- Perfect for testing

### Option 2: Use Real Email Addresses
Edit the script to use your own email:
```javascript
email: `user${i + 1}@gmail.com`,  // Change to real domain
```

Then you can actually log in with real emails.

### Option 3: Bypass Auth for Testing
In development, you can temporarily disable email verification in Supabase settings.

## Troubleshooting

### "Could not fetch movies"
Make sure you have movies in your database. The script needs actual movie IDs.

### "Missing environment variables"
Double-check you exported both variables:
```bash
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

### "Permission denied"
Make sure your SUPABASE_SERVICE_ROLE_KEY has insert permissions on all tables.

### Script hangs
May be slow with large databases. Give it 5-10 minutes for 25 users × 50 ratings.

## Next Steps

1. ✅ Seed the data
2. 🎬 Explore the platform with multiple user perspectives
3. 🧪 Test filtering, searching, and discovery
4. 🎯 Verify badges are awarding correctly
5. 👥 Check social features (following, feed)
6. 📊 Review ranking and sorting logic

Enjoy! Your platform now has a living, breathing community. 🎉
