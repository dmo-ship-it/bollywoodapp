# Fan Culture Badge System

## Overview

The fan culture badge system celebrates diverse communities within Indian cinema fandom. Users unlock badges by demonstrating passion for specific actors, directors, films, regions, and eras.

## Badge Categories

### 🏅 Core Achievement Badges (9)
- **First Watch** 🎬 - Rate your first film
- **Film Fan** 🍿 - Rate 10 films
- **Cinephile** 🎭 - Rate 50 films
- **Hopeless Romantic** ❤️ - Love 10 films
- **Collector** 🔖 - Add 5 films to watchlist
- **Opinionated** ⚖️ - Make 10 comparisons
- **On Fire** 🔥 - 3-week watch streak
- **Unstoppable** ⚡ - 8-week watch streak
- **Taste Twin** 🤝 - Find someone 80%+ alike

### 👑 Bollywood Legends (4)
- **King's Court** 👑 - 5+ Shah Rukh Khan films, 4.2+ avg
- **Bhaijaan** 💪 - 6+ Salman Khan films, 4.0+ avg
- **Big B Legacy** 🎩 - 5+ Amitabh Bachchan films, 4.1+ avg
- **DDLJ Forever** 💕 - Rated DDLJ 5-stars + 3 SRK romance films

### 🎬 South Indian Cinema (3)
- **Thalaivar Devote** 🔱 - 5+ Rajinikanth films, 4.0+ avg
- **Thalapathy Fan** 🎬 - 6+ Vijay films, 4.0+ avg
- **Artist's Patron** 🎨 - 4+ Kamal Haasan films, 4.3+ avg

### 🎞️ Iconic Films (2)
- **Sholay Legend** 🔫 - Rated Sholay 5-stars + 5 classic action films
- **3 Idiots Devotee** 🎓 - Rated 3 Idiots 5-stars + 4 Aamir Khan films

### 🎥 Director Devotion (2)
- **Mani Ratnam Admirer** 🌊 - 4+ Mani Ratnam films, 4.2+ avg
- **Anurag's Follower** 🖤 - 3+ Anurag Kashyap films, 4.1+ avg

### 🇮🇳 Regional Pride (3)
- **Tamil Cinema Pride** 🇮🇳 - 10+ Tamil films, 50%+ of total
- **Malayalam Cinephile** 🌴 - 8+ Malayalam films, 4.0+ avg
- **Telugu Blockbuster Fan** ⚡ - 8+ Telugu films, 4.0+ avg

### 🎨 Taste-Based (3)
- **90s Nostalgic** 📼 - 50%+ 1990-2000 films, 4.1+ avg
- **Masala Enthusiast** 🎪 - Action + Comedy = 60%+ of taste
- **Art House Aficionado** 🎭 - Drama 4.3+ avg, 5+ directors

## Implementation

### Files Modified

1. **`/lib/badges.js`**
   - `BADGES` array: Defines all 27 badges with emoji, label, and description
   - `checkFanCultureBadges()`: Complex detection logic for fan culture badges
   - `checkAndAwardBadges()`: Main function that checks all conditions and inserts new badges

2. **Pages Created**
   - `/badges/page.js` - Badge collection dashboard with progress
   - `/fan-cultures/page.js` - Discover fan cultures and communities
   - `/fans/[badgeId]/page.js` - View users with specific badge

3. **Components Updated**
   - `Header.js` - Added Badges and Fan Cultures navigation links
   - `profile/page.js` - Added Badges link to quick actions

### Badge Detection Algorithm

#### Core Achievements
Simple counts checked against thresholds:
- Rated films count
- Loved films (5-star ratings)
- Comparisons made
- Watchlist items
- Current streak (from user_profiles.streak_current)

#### Fan Culture Badges
Complex multi-step algorithm:

1. **Fetch user's rated movies** with full movie data
2. **Fetch movie credits** (actors and directors)
3. **Build aggregation maps** of:
   - Actor → [ratings across their films]
   - Director → [ratings across their films]
4. **Check 18 badge conditions**:
   - Actor avg rating thresholds
   - Specific film ratings
   - Regional language filters
   - Era/year ranges
   - Genre composition

```javascript
// Example: Actor badge detection
const rajini = Object.values(actorMap).find(a => 
  a.name.includes("rajinikanth")
);
if (rajini && 
    rajini.films.length >= 5 && 
    avgRating(rajini.films) >= 4.0) {
  newBadges.push("thalaivar");
}
```

### Data Dependencies

The system requires:
- `user_reactions` table with rating, movie_id
- `movies` table with title, year, genres, language
- `movie_credits` table with movie_id, role, person
- `people` table with id, name
- `user_profiles` table with streak_current
- `user_badges` table for storage

## User Experience

### Discovery Journey

1. **User starts rating films** → Unlocks core achievement badges
2. **Rates 5+ films from an actor** → Unlocks actor-specific badges
3. **Visits `/badges`** → Sees all badges and progress
4. **Discovers `/fan-cultures`** → Learns about communities
5. **Clicks fan badge** → Views `/fans/[badgeId]` to see community members

### Key Features

✨ **Progress Tracking**
- Badges page shows which ones are earned vs. locked
- Progress bar shows overall collection completion

👥 **Community Building**
- `/fans/[badgeId]` pages show all users with badge
- Displays when they earned it and film count
- Links to their public profiles

🎭 **Cultural Celebration**
- Badges named after cultural terms (Thalaivar, Bhaijaan, etc.)
- Grouped by meaningful categories
- Fan Cultures page explains each community

## Workflow Integration

### Awarding Badges

Badges are checked and awarded when:
1. User rates a film: `checkAndAwardBadges()` called
2. User adds to watchlist
3. User makes a comparison
4. Streak calculated (scheduled job)

### Schema Example

```sql
-- Badge earned by user
INSERT INTO user_badges (user_id, badge_id, earned_at)
VALUES (user-123, 'thalaivar', NOW());

-- Query users with badge
SELECT user_profiles.* 
FROM user_profiles
JOIN user_badges ON user_profiles.user_id = user_badges.user_id
WHERE user_badges.badge_id = 'srk_fan'
ORDER BY user_badges.earned_at DESC;
```

## Future Enhancements

- **Actor comparison badges**: "SRK vs Salman fan"
- **Era-crossing badges**: "Movies from 5 decades"
- **Niche director badges**: Lesser-known directors with dedicated fans
- **Badge upgrades**: Bronze → Silver → Gold levels
- **Social features**: "Meet other [badge] fans" recommendations
- **Badge progression tracker**: Show how close you are to next badge

## Testing Checklist

- [ ] Core achievement badges award correctly
- [ ] Actor badges detect with name variations (lowercase, etc.)
- [ ] Regional badges filter by language correctly
- [ ] Era/decade badges group by year ranges
- [ ] Fan community pages load without N+1 queries
- [ ] Badge links work from all pages
- [ ] Badges display on profile stats tab
- [ ] Badge descriptions are clear and accurate

## Notes

- Actor name matching is case-insensitive but exact (handles spacing)
- Regional language field must match exactly ("Tamil", "Telugu", "Malayalam")
- Average ratings calculated only from rated films (rating > 0)
- Community size queries may need pagination for very popular badges
- Badge earning is permanent (no revocation for lower ratings later)
