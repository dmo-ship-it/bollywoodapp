# 🎮 Gamification System Setup

Complete guide to implementing the points, tiers, and leaderboard system.

## What Gets Built

- 🏆 **Leaderboard System** - All-time and monthly rankings
- 💰 **Points Tracking** - Award points for every action
- 🎯 **Tier System** - 5 tiers from Founder to Legendary
- 🔗 **Referral System** - Share codes, earn points
- 📊 **Analytics** - Track engagement and growth

## Architecture

### Database Tables (from `create-points-schema.sql`)

1. **user_points** - Tracks total and monthly points, tier, founder status
2. **referrals** - Links referrers to referees, tracks milestones
3. **points_history** - Audit log of all point awards
4. **referral_codes** - User's unique referral code

### Utility Functions (`/lib/points.js`)

- `POINT_VALUES` - All point awards defined in one place
- `TIERS` - 5 tier definitions with requirements
- `getTierFromPoints()` - Calculate tier from points
- `awardPoints()` - Award points to user and update totals
- `recordReferral()` - Create referral relationship
- `checkReferralMilestone()` - Award bonus when referee hits 10 ratings
- `getLeaderboard()` - Fetch ranked users
- `getReferralLeaderboard()` - Top referrers

## Implementation Steps

### Step 1: Create Database Schema

1. Go to Supabase console → SQL Editor
2. Copy all SQL from `scripts/create-points-schema.sql`
3. Run it
4. Verify tables exist in Database → Tables

### Step 2: Update Profile Page

Add the PointsCard to show referral code and tier:

In `/app/profile/page.js`, add near the top of the return statement:

```javascript
import PointsCard from "../components/PointsCard";

// In the profile page JSX, after the badges showcase:
<PointsCard userId={user.id} displayName={profile?.display_name} />
```

### Step 3: Add Leaderboard Link

Update `/app/components/Header.js` to add leaderboard link:

```javascript
{ href: "/leaderboards", label: "Rankings" },  // Already there, good!
```

Or add it to mobile nav if needed.

### Step 4: Integrate Points Awarding

Update these files to call `awardPoints()`:

**In `/app/components/WahWahButton.js`** (when user adds wah):
```javascript
import { awardPoints } from "../../lib/points";

// After vote is recorded:
if (!voted) {
  await awardPoints(supabase, user.id, "RECEIVE_WAH");
}
```

**In `/app/movies/[id]/page.js`** (when user rates film):
```javascript
import { awardPoints, checkReferralMilestone } from "../../lib/points";

// After rating is saved:
await awardPoints(supabase, user.id, "RATE_FILM");
await checkReferralMilestone(supabase, user.id); // Check if they hit 10 films

// Also update user_points on first rating:
const { count: ratedCount } = await supabase
  .from("user_reactions")
  .select("*", { count: "exact" })
  .eq("user_id", user.id)
  .gt("rating", 0);

if (ratedCount === 1) {
  // First rating - ensure user_points row exists
  await supabase.from("user_points").upsert({ user_id: user.id });
}
```

**In `/app/components/FollowButton.js`** (when user follows):
```javascript
import { awardPoints } from "../../lib/points";

// After follow is recorded:
if (!isFollowing) {
  await awardPoints(supabase, user.id, "FOLLOW_USER");
}
```

**In `/app/compare/page.js`** (when user compares):
```javascript
import { awardPoints } from "../../lib/points";

// After comparison is saved:
await awardPoints(supabase, user.id, "COMPARE_FILMS");
```

**In `/app/community/new/page.js`** (when user creates list):
```javascript
import { awardPoints } from "../../lib/points";

// After list is created:
await awardPoints(supabase, user.id, "CREATE_LIST");
```

### Step 5: Set Up Referral System

When users sign up, they might have a `?ref=CODE` query parameter:

In `/app/auth/callback/page.js` or your signup flow:

```javascript
import { recordReferral } from "../../lib/points";
import { generateReferralCode } from "../../lib/points";

// After user signs up successfully:
const urlParams = new URLSearchParams(window.location.search);
const referralCode = urlParams.get("ref");

if (referralCode) {
  // Find the referrer by code
  const { data: existingCode } = await supabase
    .from("referral_codes")
    .select("user_id")
    .eq("code", referralCode)
    .single();

  if (existingCode) {
    await recordReferral(supabase, existingCode.user_id, newUser.id, referralCode);
  }
}

// Create referral code for new user
const newCode = generateReferralCode(newUser.id);
await supabase.from("referral_codes").insert({
  user_id: newUser.id,
  code: newCode,
});

// Initialize user_points
await supabase.from("user_points").insert({
  user_id: newUser.id,
  total_points: 0,
  is_founder: false, // Set to true if < 100 signups
});
```

### Step 6: Update Public Profile Card

In `/app/u/[username]/page.js`, add tier badge:

```javascript
import { getTierFromPoints } from "../../lib/points";

// After fetching user data:
const tier = getTierFromPoints(profile.points || 0, profile.is_founder);

// In JSX, after the streak badge:
{tier && (
  <span className="text-xs bg-orange-50 border border-orange-200 text-orange-600 font-bold px-3 py-1.5 rounded-full">
    {tier.label}
  </span>
)}
```

## Testing

### Manual Testing Checklist

- [ ] User can see their tier and points on profile
- [ ] Leaderboards page shows top users
- [ ] User can see their rank and progress to next tier
- [ ] Referral code displays and can be copied
- [ ] Points increase when user rates a film
- [ ] Points increase for other actions (follow, compare, etc.)
- [ ] Tier updates as points accumulate
- [ ] Referral bonus awarded when friend signs up
- [ ] Referral milestone awarded when referee rates 10 films

### Test Data

```sql
-- Manually set founder status for early users
UPDATE user_points 
SET is_founder = true 
WHERE user_id IN (
  SELECT user_id FROM user_profiles 
  ORDER BY created_at LIMIT 100
);

-- Give test user some points
UPDATE user_points 
SET total_points = 2500, this_month_points = 1200 
WHERE user_id = 'test-user-id';
```

## Point Values Reference

```
RATE_FILM: 5
FOLLOW_USER: 10
COMPARE_FILMS: 15
CREATE_LIST: 20
RECEIVE_WAH: 2
REFERRAL_SIGN_UP: 100
REFERRAL_MILESTONE: 250
REFERRAL_BONUS: 50
```

## Tier System Reference

```
🏛️ Founder       0 pts   - First 100 users
🥈 Silver        500 pts
🥇 Gold          2000 pts
💎 Platinum      5000 pts
👑 Legendary     10000 pts
```

## Files Changed

**New Files:**
- `/lib/points.js` - Core gamification logic
- `/app/leaderboards/page.js` - Leaderboard page
- `/app/components/PointsCard.js` - Points/referral display
- `/scripts/create-points-schema.sql` - Database schema

**Files to Update:**
- `/app/profile/page.js` - Add PointsCard
- `/app/components/WahWahButton.js` - Award points on wah
- `/app/movies/[id]/page.js` - Award points on rating
- `/app/components/FollowButton.js` - Award points on follow
- `/app/compare/page.js` - Award points on comparison
- `/app/community/new/page.js` - Award points on list creation
- `/app/u/[username]/page.js` - Show tier on public profile
- Authentication flow - Handle referral codes on signup

## Future Enhancements

- 📧 Email notifications: "You leveled up to Gold!" 
- 🎯 Achievements: Special badges for hitting 10k points, etc.
- 🏅 Per-category leaderboards (most films rated, fastest to tier, etc.)
- 📊 Analytics dashboard for you to see growth metrics
- 🎁 Seasonal rewards (bonus points during special events)
- 💫 VIP features unlocked at certain tiers
- 🎪 Tournaments (weekly challenges with point multipliers)

## Deployment Notes

- Run `create-points-schema.sql` in production Supabase before deploying code
- Founder status should be set based on signup order (consider a backend job)
- Monitor points/referral tables for accuracy
- Consider sending founder badges to early users as thank-you

That's it! Follow these steps and your gamification system will be live. 🚀
