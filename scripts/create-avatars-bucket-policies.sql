-- Storage RLS policies for the avatars bucket
-- Run this in: Supabase Dashboard → SQL Editor

-- Allow anyone to read avatars (bucket is public)
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatar
CREATE POLICY "avatars_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to replace their own avatar
CREATE POLICY "avatars_auth_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid());
