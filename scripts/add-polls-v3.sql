-- Poll 'other' subject support
-- Run this in the Supabase SQL editor AFTER add-polls-combined.sql and add-polls-v2.sql

-- Store custom options as a JSON array on the poll itself
-- e.g. ["AMC Gulf Pointe", "Regal Dunvale", "Cinemark 18"]
alter table community_polls
  add column if not exists options jsonb;

-- Store the selected option text on responses for 'other' polls
alter table community_poll_responses
  add column if not exists option_text text;

-- Relax the check to also allow option_text-only responses
alter table community_poll_responses
  drop constraint if exists response_has_one_subject;

alter table community_poll_responses
  add constraint response_has_one_subject
  check (
    (movie_id   is not null and person_id is null     and option_text is null) or
    (person_id  is not null and movie_id  is null     and option_text is null) or
    (option_text is not null and movie_id is null     and person_id  is null)
  );

-- Unique constraint so each user can only pick each option once per poll
alter table community_poll_responses
  drop constraint if exists community_poll_responses_poll_id_user_id_movie_id_key;
alter table community_poll_responses
  drop constraint if exists community_poll_responses_poll_id_user_id_person_id_key;

-- Re-add as partial unique indexes (safer than multi-col unique with nulls)
create unique index if not exists uniq_response_movie
  on community_poll_responses(poll_id, user_id, movie_id)
  where movie_id is not null;

create unique index if not exists uniq_response_person
  on community_poll_responses(poll_id, user_id, person_id)
  where person_id is not null;

create unique index if not exists uniq_response_option
  on community_poll_responses(poll_id, user_id, option_text)
  where option_text is not null;
