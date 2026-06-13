-- Trivia: per-language daily question bank + fun-fact tier
--
-- Upgrades the original single-global-question-per-day model
-- (scripts/create-trivia-schema.sql) into a per-language rotating bank.
--
-- Selection model: each language ('hi','ta','ml','te') has its own bank of
-- questions numbered by day_index (0-based). The question shown on a given day
-- is bank[ daysSinceEpoch % bankSize ] for the user's top language. fun_fact
-- questions are assigned the lowest day_index values so the most interesting
-- questions surface first.
--
-- Safe to run on the existing trivia_questions table.

-- 1. New columns ------------------------------------------------------------
ALTER TABLE trivia_questions ADD COLUMN IF NOT EXISTS language   VARCHAR(5);
ALTER TABLE trivia_questions ADD COLUMN IF NOT EXISTS day_index  INT;
ALTER TABLE trivia_questions ADD COLUMN IF NOT EXISTS source_url TEXT;
-- category already exists (actor/director/film/...); we standardise on
-- 'fun_fact' for sourced goofs/trivia and 'factual' for DB-template questions.

-- 2. Relax the legacy single-question-per-day constraints -------------------
-- The old schema had: date DATE UNIQUE NOT NULL. With a per-language bank we
-- no longer key questions by calendar date, so drop that.
ALTER TABLE trivia_questions ALTER COLUMN date DROP NOT NULL;

DO $$
BEGIN
  -- Drop the auto-named UNIQUE constraint on date if it exists.
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'trivia_questions'::regclass
      AND contype = 'u'
      AND conname = 'trivia_questions_date_key'
  ) THEN
    ALTER TABLE trivia_questions DROP CONSTRAINT trivia_questions_date_key;
  END IF;
END $$;

-- 3. One question per (language, day_index) slot ----------------------------
ALTER TABLE trivia_questions
  DROP CONSTRAINT IF EXISTS trivia_questions_lang_day_key;
ALTER TABLE trivia_questions
  ADD CONSTRAINT trivia_questions_lang_day_key UNIQUE (language, day_index);

-- 4. Indexes ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_trivia_questions_lang_day
  ON trivia_questions(language, day_index);

-- 5. Optional cleanup -------------------------------------------------------
-- Any pre-existing rows from the old global model have NULL language and will
-- never be selected by the new rotation. Remove them if desired:
-- DELETE FROM trivia_questions WHERE language IS NULL;
