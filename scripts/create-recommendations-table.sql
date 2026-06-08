-- Precomputed per-user movie recommendations from matrix factorization
-- Rebuilt weekly by scripts/build_recommendations.py

CREATE TABLE IF NOT EXISTS user_recommendations (
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id  uuid NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  score     numeric,       -- predicted affinity score from SVD
  rank      integer,       -- 1 = top recommendation
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, movie_id)
);

-- Fast lookup: "give me this user's top N recommendations in order"
CREATE INDEX IF NOT EXISTS idx_user_recommendations_user_rank
  ON user_recommendations(user_id, rank);

-- RLS: users can only read their own recommendations
ALTER TABLE user_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recommendations"
  ON user_recommendations FOR SELECT
  USING (auth.uid() = user_id);
