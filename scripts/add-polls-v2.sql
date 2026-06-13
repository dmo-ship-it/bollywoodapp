-- Poll subject type + people support
-- Run this in the Supabase SQL editor AFTER add-polls.sql

-- Add subject type to polls ('movies' or 'people')
alter table community_polls
  add column if not exists poll_subject text not null default 'movies';

-- Make movie_id nullable and add person_id to responses
alter table community_poll_responses
  alter column movie_id drop not null;

alter table community_poll_responses
  add column if not exists person_id uuid references people(id) on delete cascade;

-- Ensure each response has exactly one of movie_id or person_id
alter table community_poll_responses
  drop constraint if exists response_has_one_subject;
alter table community_poll_responses
  add constraint response_has_one_subject
  check (
    (movie_id is not null and person_id is null) or
    (person_id is not null and movie_id is null)
  );

-- Index for person lookups
create index if not exists idx_poll_responses_person_id on community_poll_responses(person_id);
