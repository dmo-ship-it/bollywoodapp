# Bollywood App — Movie Data Schema
## What TMDB gives us, what we need to add, and how to structure it

---

## What TMDB Provides (Free, via API)

Filter for Hindi/Indian films: `GET /discover/movie?with_original_language=hi&region=IN`

### Core fields available out of the box
| Field | TMDB key | Notes |
|---|---|---|
| Title | `title` | English title |
| Original title | `original_title` | Hindi/Devanagari title |
| Plot summary | `overview` | English description |
| Release date | `release_date` | YYYY-MM-DD |
| Runtime | `runtime` | In minutes |
| Genres | `genres` | Generic (Action, Drama, etc.) |
| Poster image | `poster_path` | Append to base image URL |
| Backdrop image | `backdrop_path` | For hero/banner UI |
| Popularity score | `popularity` | TMDB's own metric |
| Community rating | `vote_average`, `vote_count` | TMDB user ratings |
| Budget / Revenue | `budget`, `revenue` | USD — unreliable for Indian films |
| Tagline | `tagline` | |
| IMDB ID | `imdb_id` | Useful for cross-referencing |
| Production companies | `production_companies` | Yash Raj, Dharma, etc. |
| Cast & crew | `/movie/{id}/credits` | Names, roles, profile photos |
| Plot keywords | `/movie/{id}/keywords` | Community-contributed |
| OTT availability | `/movie/{id}/watch/providers` | Netflix, Prime, Hotstar — by region |
| Trailers / clips | `/movie/{id}/videos` | YouTube keys |
| Similar movies | `/movie/{id}/similar` | |

### TMDB limitations for Bollywood
- No "Bollywood" tag — must filter by `with_original_language=hi` (misses some films)
- Revenue/budget data is unreliable or missing for most Indian films
- Older films (pre-2000) have sparse data and missing posters
- No music/soundtrack information
- No Indian awards data (Filmfare, National Awards, IIFA)
- No Indian certification (U / UA / A)
- No mood or vibe tags

---

## Proposed Database Schema

### Table: `movies`
The core film record. Pull from TMDB, augment manually or via community.

```
id                  UUID (primary key)
tmdb_id             INTEGER (foreign key to TMDB, for syncing)
imdb_id             VARCHAR

-- Identity
title               VARCHAR          -- "Dil Chahta Hai"
title_hindi         VARCHAR          -- "दिल चाहता है"
tagline             VARCHAR          -- "It's the time of your life. Live it."
overview            TEXT             -- Plot summary
year                INTEGER          -- 2001
release_date        DATE

-- Media
poster_url          VARCHAR          -- TMDB image URL
backdrop_url        VARCHAR          -- Wide banner image
trailer_youtube_key VARCHAR          -- For embedding trailer

-- Film details
runtime_minutes     INTEGER
language            VARCHAR          -- "Hindi", "Tamil", "Telugu", etc.
certificate         VARCHAR          -- "U", "UA", "A" (Indian censor board)
production_house    VARCHAR[]        -- ["Excel Entertainment", "Excel Movies"]
is_remake           BOOLEAN
remake_of           VARCHAR          -- Original film title if remake

-- Commercial
box_office_india    BIGINT           -- In INR crore (manual or scraped)
box_office_worldwide BIGINT          -- In INR crore
verdict             VARCHAR          -- "Blockbuster" / "Hit" / "Average" / "Flop" / "Disaster"

-- Platform
ott_platforms       VARCHAR[]        -- ["Netflix", "Prime Video", "JioCinema"]
ott_updated_at      TIMESTAMP        -- OTT changes frequently

-- Our community ratings
avg_rating          DECIMAL(3,1)     -- Our app's average (0-10)
total_ratings       INTEGER
total_reviews       INTEGER
total_logs          INTEGER          -- Times logged (including no rating)

-- Metadata
created_at          TIMESTAMP
updated_at          TIMESTAMP
is_verified         BOOLEAN          -- Manually reviewed for data quality
```

---

### Table: `people`
Directors, actors, composers, lyricists — everyone.

```
id                  UUID
tmdb_id             INTEGER
name                VARCHAR          -- "Aamir Khan"
name_hindi          VARCHAR          -- "आमिर ख़ान"
photo_url           VARCHAR
bio                 TEXT
born_on             DATE
birthplace          VARCHAR
primary_role        VARCHAR          -- "Actor" / "Director" / "Composer" / "Lyricist"
is_verified         BOOLEAN
```

---

### Table: `movie_credits`
Links films to people with their role.

```
id                  UUID
movie_id            UUID → movies.id
person_id           UUID → people.id
role                VARCHAR          -- "Director", "Actor", "Music Director", "Lyricist", "Cinematographer", "Producer"
character_name      VARCHAR          -- For actors: "Akbar" or "Rahul"
billing_order       INTEGER          -- 1 = top billed
```

---

### Table: `movie_genres`
Standard genres from TMDB + Bollywood-specific ones.

```
id                  UUID
movie_id            UUID → movies.id
genre               VARCHAR

-- Standard: Action, Comedy, Drama, Romance, Thriller, Horror, Sci-Fi, Crime, Musical
-- Bollywood-specific: Masala, Social Drama, Mythological, Dacoit, Patriotic, Multi-starrer
```

---

### Table: `movie_moods`
The StoryGraph-style mood tags — critical for discovery.

```
id                  UUID
movie_id            UUID → movies.id
mood                VARCHAR
upvotes             INTEGER          -- Community-voted

-- Suggested moods:
-- Emotional, Feel-good, Dark, Funny, Thought-provoking, Nostalgic,
-- Inspirational, Romantic, Intense, Family-friendly, Bittersweet,
-- Edge-of-your-seat, Slow-burn, High-energy, Comfort watch
```

---

### Table: `movie_vibes`
Bollywood-specific cultural descriptors (RateYourMusic-style tags).

```
id                  UUID
movie_id            UUID → movies.id
vibe                VARCHAR
upvotes             INTEGER

-- Suggested vibes:
-- "NRI nostalgia", "Great songs", "Classic masala", "Art house",
-- "Feel-good family watch", "Cult classic", "Underrated gem",
-- "Controversial", "Social message", "Award bait", "Timepass",
-- "90s nostalgia", "Remake done right", "Pan-India release"
```

---

### Table: `movie_awards`
Indian awards — a key differentiator from TMDB.

```
id                  UUID
movie_id            UUID → movies.id
award_body          VARCHAR          -- "Filmfare", "National Film Awards", "IIFA", "Screen Awards"
award_category      VARCHAR          -- "Best Film", "Best Actor", "Best Director"
person_id           UUID → people.id -- NULL if it's a film-level award
year                INTEGER
result              VARCHAR          -- "Won" / "Nominated"
```

---

### Table: `soundtrack`
Songs are central to Bollywood — no other film industry treats music this way.

```
id                  UUID
movie_id            UUID → movies.id
song_title          VARCHAR          -- "Chaiyya Chaiyya"
singer              VARCHAR[]        -- ["Sukhwinder Singh", "Sapna Awasthi"]
music_director_id   UUID → people.id
lyricist_id         UUID → people.id
duration_seconds    INTEGER
is_title_track      BOOLEAN
youtube_key         VARCHAR          -- Official music video
```

---

### Table: `eras`
Useful for challenges, collections, and filtering.

```
-- Pre-Golden Era: before 1943
-- Golden Era: 1943–1960
-- Parallel Cinema: 1960s–1980s (art house wave)
-- Masala Era: 1970s–1980s
-- Romantic Era: 1990s (SRK/Kajol peak)
-- New Wave: 2000s (Dil Chahta Hai onwards)
-- Contemporary: 2010s–present
```
Map movies to eras via a `movie_era` junction table or a computed field on `year`.

---

## Fields Priority: What to Populate First

### Phase 1 — Pull from TMDB (automated)
- title, overview, release_date, runtime, genres, poster, backdrop, cast/crew, trailer, OTT platforms, imdb_id

### Phase 2 — Manually curate for top 500 films
- box_office_india, verdict, certificate, is_remake, production_house, awards (Filmfare at minimum), soundtrack (top 3 songs per film)

### Phase 3 — Community contributed (after launch)
- moods, vibes, additional tags, corrections

---

## Seed Dataset — The Essential 500

Start with films that cover these categories so your app has breadth from day one:

| Category | Target count |
|---|---|
| All-time classics (Sholay, Mother India, Pyaasa) | 30 |
| 90s blockbusters (DDLJ, KKHH, Hum Aapke Hain Koun) | 60 |
| 2000s new wave (DCH, Lagaan, Black Friday, Dev D) | 80 |
| 2010s hits (3 Idiots, Gangs of Wasseypur, PK, Dangal) | 100 |
| 2020s recent (RRR Hindi dub, Pathaan, Jawan, Animal) | 60 |
| Cult classics and underrated gems | 50 |
| Top director retrospectives (5–10 films each) | 80 |
| Top actor filmographies (5–10 films each) | 40 |

**Key directors to cover completely:** Anurag Kashyap, Mani Ratnam, Imtiaz Ali, Zoya Akhtar, Sanjay Leela Bhansali, Rajkumar Hirani, Vishal Bhardwaj, Shoojit Sircar, Farah Khan

**Key actors to cover completely:** SRK, Aamir Khan, Salman Khan, Amitabh Bachchan, Deepika Padukone, Ranveer Singh, Taapsee Pannu, Ayushmann Khurrana

---

## TMDB API Quick Start

```bash
# Get an API key (free) at: https://www.themoviedb.org/settings/api

# Fetch Hindi movies sorted by popularity
GET https://api.themoviedb.org/3/discover/movie
  ?api_key=YOUR_KEY
  &with_original_language=hi
  &sort_by=vote_count.desc
  &vote_count.gte=100
  &page=1

# Get full details for a film
GET https://api.themoviedb.org/3/movie/{movie_id}
  ?api_key=YOUR_KEY
  &append_to_response=credits,keywords,videos,watch/providers
```

The `append_to_response` trick lets you get credits, trailers, and OTT availability in a single API call — essential for efficient seeding.

---

## Next Steps After Schema
1. Sign up for a free TMDB API key
2. Write a script to pull top 500 Hindi films into your database
3. Manually review and fill in gaps (awards, box office, songs)
4. Define what "Bollywood Wrapped" needs — this drives which stats to track from day one
