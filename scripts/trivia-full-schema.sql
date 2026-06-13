-- Full trivia schema — run this once in Supabase SQL Editor.
-- Creates trivia_questions and user_trivia_responses with per-language
-- day-index rotation support. Safe to run on a fresh database.

-- 1. Main questions table -------------------------------------------------------
CREATE TABLE IF NOT EXISTS trivia_questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language       VARCHAR(5),           -- 'hi' | 'ta' | 'ml' | 'te'
  day_index      INT,                  -- 0-based rotation index within a language bank
  question       TEXT NOT NULL,
  options        TEXT[] NOT NULL,      -- 4-element array
  correct_answer INT NOT NULL,         -- 0–3 index
  explanation    TEXT NOT NULL,
  source_url     TEXT,                 -- for fun_fact questions
  movie_id       UUID REFERENCES movies(id) ON DELETE SET NULL,
  category       VARCHAR(50),          -- 'fun_fact' | 'factual'
  difficulty     VARCHAR(20) DEFAULT 'medium',
  date           DATE,                 -- legacy column, not used by new rotation
  created_at     TIMESTAMP DEFAULT NOW()
);

-- One question per (language, day_index) slot
ALTER TABLE trivia_questions
  DROP CONSTRAINT IF EXISTS trivia_questions_lang_day_key;
ALTER TABLE trivia_questions
  ADD CONSTRAINT trivia_questions_lang_day_key UNIQUE (language, day_index);

-- 2. User responses table -------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_trivia_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users ON DELETE CASCADE,
  question_id     UUID REFERENCES trivia_questions(id) ON DELETE CASCADE,
  selected_answer INT NOT NULL,
  is_correct      BOOLEAN NOT NULL,
  answered_date   DATE NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

-- 3. RLS -----------------------------------------------------------------------
ALTER TABLE trivia_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trivia_responses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='trivia_questions' AND policyname='Trivia questions readable') THEN
    CREATE POLICY "Trivia questions readable" ON trivia_questions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='trivia_questions' AND policyname='Anyone can create trivia') THEN
    CREATE POLICY "Anyone can create trivia" ON trivia_questions FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_trivia_responses' AND policyname='Users can view own trivia responses') THEN
    CREATE POLICY "Users can view own trivia responses" ON user_trivia_responses FOR SELECT USING (auth.uid() = user_id OR true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_trivia_responses' AND policyname='Users can submit trivia answers') THEN
    CREATE POLICY "Users can submit trivia answers" ON user_trivia_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 4. Indexes -------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_trivia_questions_lang_day
  ON trivia_questions(language, day_index);
CREATE INDEX IF NOT EXISTS idx_trivia_questions_date
  ON trivia_questions(date DESC);
CREATE INDEX IF NOT EXISTS idx_trivia_questions_movie
  ON trivia_questions(movie_id);
CREATE INDEX IF NOT EXISTS idx_user_trivia_responses_user
  ON user_trivia_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trivia_responses_date
  ON user_trivia_responses(answered_date);
