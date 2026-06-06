-- User tables missing from original schema
-- Run this in Supabase SQL Editor

-- User profiles
create table if not exists user_profiles (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  email             varchar,
  display_name      varchar,
  username          varchar unique,
  bio               text,
  city              varchar,
  country           varchar,
  languages         text[],
  language_preferences text[],
  dna               jsonb,
  streak_current    integer default 0,
  streak_longest    integer default 0,
  watch_goal        integer,
  onboarding_complete boolean default false,
  role              varchar default 'user',
  updated_at        timestamptz default now(),
  created_at        timestamptz default now()
);

-- User film ratings & scores
create table if not exists user_reactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  movie_id    uuid not null references movies(id) on delete cascade,
  rating      integer check (rating between 1 and 5),
  score       numeric,          -- 0–100 computed ranking score
  notes       text,
  music_rating integer,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, movie_id)
);

-- Watchlist (bookmarks)
create table if not exists user_watchlist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  movie_id    uuid not null references movies(id) on delete cascade,
  created_at  timestamptz default now(),
  unique (user_id, movie_id)
);

-- Follow relationships
create table if not exists user_follows (
  id            uuid primary key default gen_random_uuid(),
  follower_id   uuid not null references auth.users(id) on delete cascade,
  following_id  uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz default now(),
  unique (follower_id, following_id)
);

-- Comparisons (ranking battles)
create table if not exists user_comparisons (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  movie_a_id      uuid references movies(id) on delete set null,
  movie_b_id      uuid references movies(id) on delete set null,
  winner_id       uuid references movies(id) on delete set null,
  comparison_type varchar,
  created_at      timestamptz default now()
);

-- Activity feed
create table if not exists activity_feed (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  activity_type varchar not null, -- 'rated', 'watchlisted', 'followed', etc.
  movie_id      uuid references movies(id) on delete cascade,
  metadata      jsonb,
  created_at    timestamptz default now()
);

-- Earned badges
create table if not exists user_badges (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  badge_id    varchar not null,
  earned_at   timestamptz default now(),
  unique (user_id, badge_id)
);

-- RLS policies — users can read/write their own data
alter table user_profiles    enable row level security;
alter table user_reactions   enable row level security;
alter table user_watchlist   enable row level security;
alter table user_follows     enable row level security;
alter table user_comparisons enable row level security;
alter table activity_feed    enable row level security;
alter table user_badges      enable row level security;

-- Profiles: public read, own write
create policy "public read profiles"    on user_profiles for select using (true);
create policy "own write profiles"      on user_profiles for all using (auth.uid() = user_id);

-- Reactions: public read, own write
create policy "public read reactions"   on user_reactions for select using (true);
create policy "own write reactions"     on user_reactions for all using (auth.uid() = user_id);

-- Watchlist: own read/write only
create policy "own watchlist"           on user_watchlist for all using (auth.uid() = user_id);

-- Follows: public read, own write
create policy "public read follows"     on user_follows for select using (true);
create policy "own write follows"       on user_follows for all using (auth.uid() = user_id);

-- Comparisons: own only
create policy "own comparisons"         on user_comparisons for all using (auth.uid() = user_id);

-- Activity feed: public read, own write
create policy "public read feed"        on activity_feed for select using (true);
create policy "own write feed"          on activity_feed for all using (auth.uid() = user_id);

-- Badges: public read, own write
create policy "public read badges"      on user_badges for select using (true);
create policy "own write badges"        on user_badges for all using (auth.uid() = user_id);

-- Indexes
create index if not exists idx_user_reactions_user    on user_reactions(user_id);
create index if not exists idx_user_reactions_movie   on user_reactions(movie_id);
create index if not exists idx_user_watchlist_user    on user_watchlist(user_id);
create index if not exists idx_user_follows_follower  on user_follows(follower_id);
create index if not exists idx_user_follows_following on user_follows(following_id);
create index if not exists idx_activity_feed_user     on activity_feed(user_id);
create index if not exists idx_user_badges_user       on user_badges(user_id);
