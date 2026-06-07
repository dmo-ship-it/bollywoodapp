-- Expand user_profiles with additional fields from Google OAuth + preferences
-- Run this in Supabase SQL Editor

-- Add columns if they don't exist
alter table user_profiles
  add column if not exists email text unique,
  add column if not exists full_name text,
  add column if not exists profile_picture_url text,
  add column if not exists country text,  -- extracted from Google locale (e.g., "IN", "US")
  add column if not exists preferred_languages text[],  -- array of language codes from onboarding
  add column if not exists age_range text,  -- "18-25", "25-35", "35-45", "45+"
  add column if not exists gender text,  -- "male", "female", "other", null
  add column if not exists favorite_actors text[],  -- inferred from ratings over time
  add column if not exists favorite_directors text[],  -- inferred from ratings over time
  add column if not exists created_at timestamp default now(),
  add column if not exists updated_at timestamp default now();

-- Create index for quick user lookups
create index if not exists idx_user_profiles_user_id on user_profiles(user_id);
create index if not exists idx_user_profiles_country on user_profiles(country);
create index if not exists idx_user_profiles_preferred_languages on user_profiles using gin(preferred_languages);
