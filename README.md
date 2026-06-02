# 🎬 Bollywood Engagement Platform

A Next.js web app for Indian cinema fans to rate films, discover recommendations, connect with other fans, and celebrate their unique taste in movies.

## ✨ Features

### Core
- **Film Ratings & Comparisons** - Rate movies and compare them head-to-head
- **Watchlist** - Bookmark films to watch later
- **Weekly Streaks** - Track your consistent viewing habits
- **Activity Feed** - See what friends are watching and rating

### 🧬 Taste System
- **Taste Profile** - 6-dimensional breakdown of your preferences (era, genre, language, director, actor, mood)
- **Percentile Rankings** - See how your taste compares to other users
- **Taste-Based Discovery** - Film recommendations matching your exact taste profile
- **Taste Affinity** - Find users with similar taste (80%+ match = Taste Twin badge)

### 🏆 Achievement System
- **28+ Badges** celebrating participation:
  - Progression: First Watch → Film Fan (10) → Movie Buff (25) → Devoted Viewer (50) → Century Club (100)
  - Love badges: Romantic Soul (5 loves) → Hopeless Romantic (10) → Serial Heart-Eyes (25)
  - Engagement: Opinionated → Comparison Master
  - Streaks: Getting Started (1-wk) → On Fire (3-wk) → Unstoppable (8-wk) → Legendary (13-wk)
  - **18 Fan Culture Badges** celebrating passion for actors, directors, films, and regional cinema

### 🎭 Communities
- **Fan Culture Discovery** - Find communities for Rajinikanth fans, SRK lovers, Tamil cinema enthusiasts, etc.
- **Community Members** - See other fans who share your passion
- **Follow System** - Build your network of film enthusiasts

### ✨ Special Features
- **Bollywood Wrapped** - Shareable yearly summary of your film taste
- **Public Profiles** - Shareable profile cards with your stats and DNA breakdown
- **Rankings** - Personal and global film rankings with filters

## 🛠 Tech Stack

- **Frontend**: Next.js 14+ (App Router), React 18, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Deployment**: Ready for Vercel

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free tier works great)

### Installation

1. **Clone the repo**
   ```bash
   git clone https://github.com/dmo-ship-it/bollywood-app.git
   cd bollywood-app/web
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Then fill in your Supabase credentials:
   - `NEXT_PUBLIC_SUPABASE_URL` - From Supabase Settings → API
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - From Supabase Settings → API

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## 📊 Populate with Sample Data

To see the platform with realistic fake data (25 users, 650+ ratings, communities, badges):

```bash
# Set service role key (from Supabase Settings → API)
export NEXT_PUBLIC_SUPABASE_URL="your-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-key"

# Run the seed script
node scripts/seed-fake-data.js
```

This creates:
- 25 diverse user profiles
- 650+ film ratings
- 245+ follow relationships  
- 185+ watchlist items
- 120+ automatically awarded badges

See `SEEDING_GUIDE.md` for details.

## 📁 Project Structure

```
bollywood-app/
├── web/                          # Next.js app
│   ├── app/
│   │   ├── components/           # Reusable React components
│   │   ├── profile/              # User profile pages
│   │   ├── community/            # Community & discussions
│   │   ├── fans/[badgeId]/       # Fan community pages
│   │   ├── taste-profile/        # Taste breakdown & discovery
│   │   ├── rankings/             # Film rankings
│   │   └── wrapped/              # Bollywood Wrapped
│   ├── lib/
│   │   ├── badges.js             # Badge system (28+ badges)
│   │   ├── taste.js              # Taste profile calculations
│   │   └── supabase-browser.js   # Supabase client
│   └── scripts/
│       └── seed-fake-data.js     # Generate sample data
├── BADGE_SYSTEM.md               # Badge documentation
├── SEEDING_GUIDE.md              # How to seed data
└── README.md                      # This file
```

## 🎯 Key Concepts

### Taste Profile
Breaks down your film preferences across 6 dimensions:
- **Era**: Which decades do you prefer?
- **Genre**: What genres do you gravitate to?
- **Language**: Regional cinema preferences
- **Directors**: Top 10 directors you love
- **Actors**: Top 10 actors you love
- **Mood/Vibe**: Action-packed? Emotional? Thought-provoking?

### Badge System
Badges automatically appear on your profile when you:
- Rate films (progression badges)
- Love films (love badges)
- Build streaks (consistency badges)
- Follow specific actors/directors (fan culture badges)

### Rankings
- **Personal Rankings**: Films ranked by your scores
- **Global Rankings**: Films ranked by all users' average ratings
- **Filters**: By decade, language, genre

## 📱 Pages

- `/` - Discover (film browser)
- `/profile` - Your profile with badges, stats, ratings
- `/wrapped` - Shareable yearly summary
- `/taste-profile` - Your taste breakdown & recommendations
- `/community` - Discussions, lists, and fan communities
- `/rankings` - Personal and global rankings
- `/people` - Browse user profiles
- `/feed` - Activity feed from followed users
- `/u/[username]` - Public shareable profile

## 🔐 Database Schema

Key tables:
- `user_profiles` - User account info, stats, preferences
- `user_reactions` - Film ratings and scores
- `user_badges` - Earned badges
- `user_follows` - Follow relationships
- `user_watchlist` - Films to watch
- `movies` - Film database
- `movie_credits` - Directors and actors
- `people` - Director and actor info
- `community_posts` - User discussions
- `community_lists` - Curated film lists

See Supabase console for full schema.

## 🚀 Deployment

Ready to deploy on Vercel (Next.js recommended):

1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables
4. Deploy!

## 📝 License

MIT

## 🙋 Support

Questions? Check out the documentation files:
- `BADGE_SYSTEM.md` - How the badge system works
- `SEEDING_GUIDE.md` - How to populate sample data
- `FAN_CULTURE_BADGES.md` - Details on fan culture badges

---

Built with ❤️ for Indian cinema fans everywhere 🎬🍿
