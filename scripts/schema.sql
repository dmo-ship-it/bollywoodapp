-- Bollywood App — Database Schema
-- Run this in the Supabase SQL Editor (supabase.com → your project → SQL Editor)

-- Movies
create table movies (
  id                        uuid primary key default gen_random_uuid(),
  tmdb_id                   integer unique not null,
  imdb_id                   varchar,

  title                     varchar not null,
  original_title            varchar,
  tagline                   varchar,
  overview                  text,
  year                      integer,
  release_date              date,

  poster_url                varchar,
  backdrop_url              varchar,
  trailer_url               varchar,

  runtime_minutes           integer,
  language                  varchar default 'hi',
  certificate               varchar,
  genres                    text[],
  keywords                  text[],
  production_houses         text[],

  is_remake                 boolean,
  remake_of                 varchar,

  box_office_india_crore    numeric,
  verdict                   varchar check (verdict in ('Blockbuster','Hit','Average','Flop','Disaster')),

  ott_platforms             text[],
  ott_updated_at            timestamptz default now(),

  tmdb_rating               numeric(3,1),
  tmdb_votes                integer default 0,
  tmdb_popularity           numeric,

  avg_rating                numeric(3,1),
  total_ratings             integer default 0,
  total_reviews             integer default 0,
  total_logs                integer default 0,

  mood_tags                 text[],
  vibe_tags                 text[],

  is_verified               boolean default false,
  fetched_at                timestamptz,
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

-- People (actors, directors, composers, etc.)
create table people (
  id                        uuid primary key default gen_random_uuid(),
  tmdb_id                   integer unique,
  name                      varchar not null,
  name_hindi                varchar,
  photo_url                 varchar,
  bio                       text,
  born_on                   date,
  birthplace                varchar,
  primary_role              varchar,
  is_verified               boolean default false,
  created_at                timestamptz default now()
);

-- Movie ↔ People (cast and crew)
create table movie_credits (
  id                        uuid primary key default gen_random_uuid(),
  movie_id                  uuid not null references movies(id) on delete cascade,
  person_id                 uuid not null references people(id) on delete cascade,
  role                      varchar not null,  -- 'Actor', 'Director', 'Music Director', etc.
  character_name            varchar,
  billing_order             integer
);

-- Awards
create table movie_awards (
  id                        uuid primary key default gen_random_uuid(),
  movie_id                  uuid not null references movies(id) on delete cascade,
  person_id                 uuid references people(id),
  award_body                varchar not null,  -- 'Filmfare', 'National Film Awards', 'IIFA'
  award_category            varchar not null,  -- 'Best Film', 'Best Actor', etc.
  year                      integer,
  result                    varchar check (result in ('Won', 'Nominated'))
);

-- Soundtrack
create table soundtrack (
  id                        uuid primary key default gen_random_uuid(),
  movie_id                  uuid not null references movies(id) on delete cascade,
  song_title                varchar not null,
  singers                   text[],
  music_director_id         uuid references people(id),
  lyricist_id               uuid references people(id),
  duration_seconds          integer,
  is_title_track            boolean default false,
  youtube_url               varchar
);

-- Indexes for common queries
create index on movies(year);
create index on movies(tmdb_rating desc);
create index on movies(total_logs desc);
create index on movies(verdict);
create index on movie_credits(movie_id);
create index on movie_credits(person_id);
create index on movie_credits(role);
create index on movie_awards(movie_id);
create index on soundtrack(movie_id);
