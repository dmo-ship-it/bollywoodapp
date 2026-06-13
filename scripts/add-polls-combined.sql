-- Combined polls migration (run this as a single query)

create table if not exists community_polls (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  title          text not null,
  description    text,
  poll_subject   text not null default 'movies',  -- 'movies' | 'people'
  max_picks      integer not null default 1,
  upvotes        integer not null default 0,
  response_count integer not null default 0,
  created_at     timestamptz not null default now()
);

create table if not exists community_poll_responses (
  id         uuid primary key default gen_random_uuid(),
  poll_id    uuid not null references community_polls(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  movie_id   uuid references movies(id) on delete cascade,
  person_id  uuid references people(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint response_has_one_subject check (
    (movie_id is not null and person_id is null) or
    (person_id is not null and movie_id is null)
  ),
  unique(poll_id, user_id, movie_id),
  unique(poll_id, user_id, person_id)
);

alter table community_polls          enable row level security;
alter table community_poll_responses enable row level security;

create policy "public read polls"          on community_polls          for select using (true);
create policy "own insert polls"           on community_polls          for insert with check (auth.uid() = user_id);
create policy "own update polls"           on community_polls          for update using (auth.uid() = user_id);

create policy "public read poll responses" on community_poll_responses for select using (true);
create policy "own insert poll responses"  on community_poll_responses for insert with check (auth.uid() = user_id);
create policy "own delete poll responses"  on community_poll_responses for delete using (auth.uid() = user_id);

create index if not exists idx_community_polls_created  on community_polls(created_at desc);
create index if not exists idx_poll_responses_poll_id   on community_poll_responses(poll_id);
create index if not exists idx_poll_responses_user_poll on community_poll_responses(user_id, poll_id);
create index if not exists idx_poll_responses_person    on community_poll_responses(person_id);
