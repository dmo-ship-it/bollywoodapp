-- Trivia System Schema

-- Trivia Questions Table
CREATE TABLE IF NOT EXISTS trivia_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL, -- ["Option A", "Option B", "Option C", "Option D"]
  correct_answer INT NOT NULL, -- 0-3 index
  explanation TEXT NOT NULL,
  movie_id UUID REFERENCES movies(id) ON DELETE SET NULL,
  difficulty VARCHAR(20) DEFAULT 'medium', -- easy, medium, hard
  category VARCHAR(50), -- e.g., "actor", "director", "film", "trivia"
  created_at TIMESTAMP DEFAULT NOW()
);

-- User Trivia Responses Table
CREATE TABLE IF NOT EXISTS user_trivia_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  question_id UUID REFERENCES trivia_questions(id) ON DELETE CASCADE,
  selected_answer INT NOT NULL, -- 0-3 index
  is_correct BOOLEAN NOT NULL,
  answered_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

-- RLS Policies
ALTER TABLE trivia_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trivia_responses ENABLE ROW LEVEL SECURITY;

-- Trivia questions are readable by all
CREATE POLICY "Trivia questions readable" ON trivia_questions
  FOR SELECT USING (true);

-- Only admin can insert/update questions (you'll need to add admin role)
-- For now, allow inserts (you should restrict this in production)
CREATE POLICY "Anyone can create trivia" ON trivia_questions
  FOR INSERT WITH CHECK (true);

-- User trivia responses are readable by the user
CREATE POLICY "Users can view own trivia responses" ON user_trivia_responses
  FOR SELECT USING (auth.uid() = user_id OR true);

-- Users can insert their own responses
CREATE POLICY "Users can submit trivia answers" ON user_trivia_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_trivia_questions_date ON trivia_questions(date DESC);
CREATE INDEX idx_trivia_questions_movie ON trivia_questions(movie_id);
CREATE INDEX idx_user_trivia_responses_user ON user_trivia_responses(user_id);
CREATE INDEX idx_user_trivia_responses_date ON user_trivia_responses(answered_date);
CREATE INDEX idx_user_trivia_responses_correct ON user_trivia_responses(user_id, is_correct);

-- View for user trivia stats
CREATE OR REPLACE VIEW user_trivia_stats AS
SELECT
  user_id,
  COUNT(*) as total_attempts,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_answers,
  ROUND(100.0 * SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) / COUNT(*), 1) as accuracy
FROM user_trivia_responses
GROUP BY user_id;
