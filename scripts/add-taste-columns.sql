-- Taste engine enrichment columns
-- Run this once in the Supabase SQL Editor before (re-)running scripts/enrich-plots.js.
-- Safe to run multiple times — every statement is idempotent.

alter table movies add column if not exists wikipedia_plot         text;
alter table movies add column if not exists themes                 text[];
alter table movies add column if not exists tone                   text[];
alter table movies add column if not exists comedy_style           text;     -- NEW: slapstick vs witty vs satire …
alter table movies add column if not exists realism                text;     -- NEW: grounded vs masala vs fantastical
alter table movies add column if not exists setting_tags           text[];
alter table movies add column if not exists notable_elements       text[];   -- carries "based-on-true-story", "biopic", …
alter table movies add column if not exists is_based_on_true_story boolean;
alter table movies add column if not exists has_item_number        boolean;
alter table movies add column if not exists has_intermission       boolean;

-- GIN indexes speed up tag-overlap queries (e.g. "more films like this").
create index if not exists idx_movies_themes           on movies using gin (themes);
create index if not exists idx_movies_tone             on movies using gin (tone);
create index if not exists idx_movies_setting_tags     on movies using gin (setting_tags);
create index if not exists idx_movies_notable_elements on movies using gin (notable_elements);
create index if not exists idx_movies_comedy_style     on movies (comedy_style);
