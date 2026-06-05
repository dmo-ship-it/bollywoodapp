-- Fast movie search using PostgreSQL trigram indexes
-- Run this in Supabase SQL Editor

-- 1. Enable the trigram extension (allows fast ILIKE '%query%' searches)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Trigram index on title (main search field)
CREATE INDEX IF NOT EXISTS idx_movies_title_trgm
  ON movies USING GIN (title gin_trgm_ops);

-- 3. Trigram index on original_title (catches searches in original script)
CREATE INDEX IF NOT EXISTS idx_movies_original_title_trgm
  ON movies USING GIN (original_title gin_trgm_ops);

-- 4. Index on tmdb_popularity for fast ordering
CREATE INDEX IF NOT EXISTS idx_movies_tmdb_popularity
  ON movies (tmdb_popularity DESC);

-- 5. Index on language for filtering by language
CREATE INDEX IF NOT EXISTS idx_movies_language
  ON movies (language);

-- After running this, ILIKE '%query%' searches will be ~10-50x faster.
