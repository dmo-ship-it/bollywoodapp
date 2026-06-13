-- Add wah_wah_count to activity_feed so WahWahButton can update it
alter table activity_feed
  add column if not exists wah_wah_count integer not null default 0;
