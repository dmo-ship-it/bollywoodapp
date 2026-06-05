-- Add admin role system to user_profiles
-- Run this in Supabase SQL Editor

-- 1. Add role column
ALTER TABLE user_profiles ADD COLUMN role VARCHAR DEFAULT 'user';

-- 2. Create index for faster queries
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

-- 3. Set yourself as admin (replace YOUR_USER_ID with your actual user ID from auth.users)
-- You can find your user ID by running: SELECT id FROM auth.users WHERE email = 'your-email@example.com';
-- UPDATE user_profiles SET role = 'admin' WHERE user_id = 'YOUR_USER_ID';

-- Note: After running this migration and setting yourself as admin, you'll be able to access /admin

-- Add language_preferences column to user_profiles
-- Stores an ordered array of language codes e.g. ["hi", "ta", "ml"]
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS language_preferences TEXT[] DEFAULT '{}';
