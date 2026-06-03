# Badge System - Redesigned

## Overview

Badges are automatically awarded to users as they engage with the platform. They appear prominently on the profile and celebrate participation through fan culture communities.

## Badge Categories (28+ badges)

### 🎬 Progression Badges
- **First Watch** - Rate 1 film
- **Film Fan** - Rate 10 films  
- **Movie Buff** - Rate 25 films
- **Devoted Viewer** - Rate 50 films
- **Film Enthusiast** - Rate 75 films
- **Century Club** - Rate 100 films

### 💕 Love Badges
- **Romantic Soul** - Love 5 films
- **Hopeless Romantic** - Love 10 films
- **Serial Heart-Eyes** - Love 25 films

### 🔖 Collection Badges
- **Collector** - Add 5 to watchlist
- **Curation Expert** - Add 10 to watchlist

### ⚖️ Engagement Badges
- **Opinionated** - Make 10 comparisons
- **Comparison Master** - Make 25 comparisons

### 🔥 Streak Badges
- **Getting Started** - 1-week streak
- **On Fire** - 3-week streak
- **Unstoppable** - 8-week streak
- **Legendary** - 13-week streak

### 🤝 Social Badges
- **Taste Twin** - Find someone 80%+ alike
- **Influencer** - 100+ followers

### 🎭 Fan Culture Badges (18)
Organized into communities:

**Bollywood Legends:**
- King's Court (SRK)
- Bhaijaan (Salman)
- Big B Legacy (Amitabh)
- DDLJ Forever

**South Indian Cinema:**
- Thalaivar Devote (Rajinikanth)
- Thalapathy Fan (Vijay)
- Artist's Patron (Kamal)

**Iconic Films:**
- Sholay Legend
- 3 Idiots Devotee

**Director Devotion:**
- Mani Ratnam Admirer
- Anurag's Follower

**Regional Pride:**
- Tamil Cinema Pride
- Malayalam Cinephile
- Telugu Blockbuster Fan

**Taste-Based:**
- 90s Nostalgic
- Masala Enthusiast
- Art House Aficionado

## UX Design

### On Profile
- **Badges showcase** appears prominently below quick actions
- Shows earned badges with emoji icons, labels, and count
- Only visible if user has earned badges
- Beautifully designed with orange/rose gradient background

### Fan Culture Discovery
- Users discover fan cultures in **Community → Communities tab**
- Shows 6 categories of film fandoms
- Each badge in community shows:
  - Icon and name
  - Description/unlock condition
  - Member count
  - Whether user has earned it
- Clicking a community badge goes to `/fans/[badgeId]` to meet other fans

### Automatic Awarding
- Badges checked every time user:
  - Rates a film
  - Adds to watchlist
  - Makes a comparison
  - Completes a watch streak
- `checkAndAwardBadges()` in `/lib/badges.js` handles detection
- New badges inserted into `user_badges` table automatically

## Technical Implementation

### Badge Detection Logic

**Simple Thresholds:**
- Count ratings, loved films, comparisons, watchlist items, streak
- Compare against badge thresholds

**Complex Fan Culture Detection:**
- Query user's rated movies + credits
- Build actor/director aggregation maps
- Check conditions:
  - Actor average ratings (e.g., 5+ Rajinikanth films @ 4.0+ avg)
  - Specific film ratings (e.g., Sholay 5-star)
  - Regional language composition (e.g., 10+ Tamil = 50% of total)
  - Era/decade distribution (e.g., 50%+ 1990-2000)
  - Genre composition (e.g., Action+Comedy = 60%+)

### Database Schema

```sql
-- Badges earned by users
user_badges {
  user_id: uuid
  badge_id: string (foreign key to BADGES)
  earned_at: timestamp
}
```

## Files Modified

- `/lib/badges.js` - 28+ badge definitions, detection logic
- `/community/page.js` - Added Communities tab with fan cultures
- `/profile/page.js` - Added badges showcase, removed from Stats tab
- `Header.js` - Removed Badges/Cultures nav links
- `FAN_CULTURE_BADGES.md` - Old documentation (now obsolete)

## Files Deleted

- `/badges/page.js` - Separate badges discovery page (now in Community)
- `/fan-cultures/page.js` - Separate cultures page (now in Community)

## User Journey

1. **User rates films** → System detects progress toward badges
2. **Thresholds met** → Badge automatically awarded and appears on profile
3. **User explores Community** → Discovers fan culture communities
4. **User clicks community badge** → Views `/fans/[badgeId]` to meet other fans with same badge
5. **User earns fan culture badge** → It appears on profile and they're part of that community

## Design Philosophy

✨ **Celebrate Participation** - Progressive badges encourage users to engage more
👥 **Build Communities** - Fan culture badges create identity groups
🎨 **Culturally Resonant** - Badge names reflect Indian cinema traditions
📈 **Organic Growth** - Badges appear naturally as users engage, no explicit "achievement hunting"

## Next Steps

- Monitor which badges are most commonly earned
- Consider adding difficulty tiers (bronze/silver/gold)
- Potentially add badge unlocking notifications
- Could add "compare badges" feature to see affinity with other users
