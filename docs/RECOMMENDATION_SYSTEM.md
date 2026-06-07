# Bollywood App Recommendation System

## Overview

A three-phase recommendation engine that adapts as users rate more films. Progresses from demographic popularity → personal taste matching → collaborative discovery.

---

## Phase 1: Cold Start (0-5 Ratings)

**When**: New users with no or minimal ratings  
**Goal**: Surface popular films within their demographic segment  
**Logic**: Show most-liked movies from their region + language combination

### Demographic Segments
- **India**: `country = "IN"`
- **Diaspora**: `country ≠ "IN"` AND speaks Indian language (Hindi, Tamil, Telugu, Malayalam, Kannada, Marathi, Bengali, Punjabi, Gujarati)

### Scoring
```
popularity_score = avg_rating * sqrt(rating_count)
```
- Bayesian approach: rewards high average AND sufficient sample size
- Prevents outliers (1 person rating a film 5 stars) from ranking high

### Filters
- Language: Only movies in user's preferred languages
- Region: Only movies appropriate for their segment (India vs Diaspora)
- Exclude: Already-watched/rated movies

---

## Phase 2: Warm Start (5-10 Ratings)

**When**: Users have rated 5-9 films  
**Goal**: Build personalized taste profile, rank by match to their preferences  
**Logic**: Score all candidates against their thematic, temporal, and actor/director affinities

### Taste Score
```
taste_score = (
  thematic_match * 0.60 +
  temporal_match * 0.30 +
  actor_director_match * 0.10
)
```

### Component 1: Thematic Match (60%)
Signed-affinity across multiple dimensions:

```
For each dimension (themes, tone, comedy_style, realism, setting_tags, notable_elements):
  signedWeight = avg(rating - 3) for films containing that tag
  score = signedWeight * log2(count + 1)
  
Final thematic_match = weighted sum across all dimensions with DIMENSION_WEIGHTS
```

**Dimension Weights**:
- themes: 1.0
- tone: 0.9
- comedy_style: 0.8
- genres: 0.7
- notable_elements: 0.7
- realism: 0.6
- setting_tags: 0.5
- language: 0.5
- era: 0.4

**Key Insight**: User who rates true-story dramas 4-5★ gets +affinity for those tags. User who rates slapstick 1-2★ gets -affinity, actively repelling similar films.

### Component 2: Temporal Match (30%)
Year/decade preference based on films user Loved or Liked:

```
Step 1: Get all movies rated 4-5 (Loved/Liked)
Step 2: Extract years → calculate mean_year and std_dev
Step 3: Score candidates with Gaussian decay:
  - Full points (1.0) if within 1 SD of mean year
  - Graceful decay from 1 SD to 2 SD
  - Decay beyond 2 SD, but don't exclude
```

**Example**:
```
User's top-rated movies: [2015, 2018, 2020, 2019, 2022]
mean_year = 2018.8, std_dev = 2.8
1 SD range: [2016, 2021]
2 SD range: [2013, 2024]

Candidate 2018: temporal_match = 1.0 (within 1 SD)
Candidate 2012: temporal_match = 0.3 (just outside 2 SD, decayed)
Candidate 2025: temporal_match = 0.5 (within 2 SD, minor decay)
```

### Component 3: Actor/Director Match (10%)
Signed-affinity for cast and crew:

```
For each actor/director in movies user Loved/Liked:
  signedWeight = avg(rating - 3) across their films
  score = signedWeight * log2(count + 1)
  
For candidate movie:
  actor_director_match = max(all actor/director scores in movie) / 5.0
  (capped at 1.0)
```

**Example**:
```
User loved 4 Aamir Khan films → actor_score = 4.06
User hated random actor (1 film) → actor_score = 0

Candidate with Aamir Khan: actor_director_match = 4.06 / 5.0 = 0.81
Candidate with random actor: actor_director_match = 0 / 5.0 = 0
```

### Filters
- Language: Only movies in preferred languages
- Region: Only movies for their segment (India vs Diaspora)
- Watched: Exclude already-rated movies
- No collaborative yet: not enough signal at this phase

---

## Phase 3: Warm+ (10+ Ratings)

**When**: Users have rated 10+ films  
**Goal**: Personalized ranking + social discovery via taste twins  
**Logic**: Rank by taste_score, boost results if similar users loved them

### Taste Score
Same as Phase 2:
```
taste_score = (thematic * 0.60 + temporal * 0.30 + actor_director * 0.10)
```

### Collaborative Boost (New)

#### Step 1: Identify Taste Twins
```
For all other users:
  Calculate cosine_similarity(user's ratings, other_user's ratings)
  
Taste twins = users with cosine_similarity > 70%
```

**How to calculate cosine similarity**:
- Represent each user as a vector of (movie_id, rating) pairs
- Only consider movies both users have rated
- Calculate angle between vectors: `cos(θ) = (A · B) / (|A| |B|)`
- Result: 0 = opposite taste, 1 = identical taste

#### Step 2: Apply Boost to Top Results
```
For top 30 candidates (by taste_score):
  count = number of taste_twins who rated this movie 4-5 stars
  
  final_score = taste_score + min(count * 0.02, 0.10)
  
  Example:
    taste_score = 0.75, 3 taste twins loved it
    boost = min(0.06, 0.10) = 0.06
    final_score = 0.81 (8% boost)
    
    taste_score = 0.75, 10 taste twins loved it
    boost = min(0.20, 0.10) = 0.10 (capped)
    final_score = 0.85 (13% boost max)
```

### Filters
Same as Phase 2:
- Language, region, watched movies

---

## Data Requirements

### User Data
```
user_profiles {
  user_id
  email
  full_name
  profile_picture_url
  country              -- extracted from Google locale
  preferred_languages  -- array, ranked by preference
  age_range            -- optional
  gender               -- optional
}
```

### Movie Data
```
movies {
  id
  title
  year
  genres
  language
  poster_url
  
  -- Enrichment columns (from Claude analysis)
  themes              -- text[]
  tone                -- text[]
  comedy_style        -- text (single)
  realism             -- text (single)
  setting_tags        -- text[]
  notable_elements    -- text[]
  
  -- Cast/Crew
  cast                -- text[] (actor names)
  directors           -- text[] (director names)
}
```

### User Interaction Data
```
user_reactions {
  user_id
  movie_id
  rating              -- 5: Loved, 4: Liked, 3: Okay, 2: Didn't like, 1: Hated
  created_at
}
```

### Pre-computed Data (for performance)
```
movie_popularity_by_segment {
  movie_id
  region              -- "india" | "diaspora"
  language            -- "hi" | "ta" | "te" | etc.
  avg_rating
  rating_count
  bayesian_score      -- avg_rating * sqrt(rating_count)
  last_updated
}

-- Refreshed daily/weekly via background job
```

---

## Implementation Checklist

- [ ] **Phase 1 Data**: Populate movie_popularity_by_segment table
- [ ] **Phase 1 API**: GET /api/recommendations/cold-start?country=IN&languages=hi,ta
- [ ] **Phase 2 Data**: Ensure all taste dimensions exist in movies table
- [ ] **Phase 2 API**: GET /api/recommendations/taste-based?userId=X (returns taste_score)
- [ ] **Phase 3 Data**: Add cast/directors to movies table
- [ ] **Phase 3 API**: Add taste_twin similarity calculation + boost logic
- [ ] **Tests**: Verify phase transitions (0-5 → 5-10 → 10+)
- [ ] **Tests**: Verify taste_score weights sum to 1.0
- [ ] **Tests**: Verify temporal decay (1 SD vs 2 SD)
- [ ] **Tests**: Verify cosine similarity calculation
- [ ] **Monitoring**: Track which phase users are in, average recommendation freshness

---

## Glossary

- **Signed Affinity**: Affinity score centered at 0 (negative = disliked, positive = liked)
- **Taste Twin**: User with >70% cosine similarity on rated movies
- **Bayesian Score**: Accounts for both average rating and sample size
- **Cosine Similarity**: Geometric measure of how "aligned" two users' ratings are
- **Gaussian Decay**: Smooth penalty for movies outside user's temporal preference range
