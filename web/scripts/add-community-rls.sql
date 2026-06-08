-- Row Level Security for community_posts
-- Applied 2026-06-07. Captures security that was previously only configured in
-- the Supabase dashboard, so it is reproducible from version control.
--
-- Intent: anyone may READ community posts (the community is public), but only the
-- author (auth.uid() = user_id) may insert / update / delete their own posts.
-- Mirrors the public-read + own-write pattern in scripts/create-user-tables.sql.
--
-- Safe to re-run (drops policies before recreating; ENABLE RLS is idempotent).

alter table public.community_posts enable row level security;

drop policy if exists "public read community_posts" on public.community_posts;
create policy "public read community_posts"
  on public.community_posts for select using (true);

drop policy if exists "own write community_posts" on public.community_posts;
create policy "own write community_posts"
  on public.community_posts for all using (auth.uid() = user_id);
