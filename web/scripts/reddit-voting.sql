-- Reddit-style voting + nested comment replies
-- Run once in Supabase SQL editor.

-- 1. Post downvotes column
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS downvotes integer NOT NULL DEFAULT 0;

-- 2. vote_type on community_votes (existing rows treated as upvotes)
ALTER TABLE public.community_votes
  ADD COLUMN IF NOT EXISTS vote_type text NOT NULL DEFAULT 'up'
  CHECK (vote_type IN ('up', 'down'));

-- 3. Comment voting + reply threading
ALTER TABLE public.community_comments
  ADD COLUMN IF NOT EXISTS upvotes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downvotes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE;

-- 4. Comment votes table
CREATE TABLE IF NOT EXISTS public.comment_votes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id      uuid        NOT NULL REFERENCES public.community_comments(id) ON DELETE CASCADE,
  vote_type       text        NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, comment_id)
);

ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read comment_votes"  ON public.comment_votes;
CREATE POLICY "public read comment_votes"
  ON public.comment_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "own write comment_votes" ON public.comment_votes;
CREATE POLICY "own write comment_votes"
  ON public.comment_votes FOR ALL USING (auth.uid() = user_id);
