/*
  # Allow anon access to videos table and storage

  The app uses a demo login (no Supabase Auth), so auth.uid() is null.
  Update all videos RLS policies and storage policies to allow anon role as well.

  ## Changes
  - Drop existing authenticated-only policies on videos table
  - Add new policies allowing both anon and authenticated roles
  - Drop existing storage policies for videos bucket
  - Add new storage policies allowing anon role
*/

-- videos table policies
DROP POLICY IF EXISTS "Authenticated users can view videos" ON videos;
DROP POLICY IF EXISTS "Authenticated users can insert videos" ON videos;
DROP POLICY IF EXISTS "Authenticated users can update videos" ON videos;
DROP POLICY IF EXISTS "Authenticated users can delete videos" ON videos;

CREATE POLICY "Anyone can view videos"
  ON videos FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert videos"
  ON videos FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update videos"
  ON videos FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete videos"
  ON videos FOR DELETE
  TO anon, authenticated
  USING (true);

-- storage policies for videos bucket
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete videos" ON storage.objects;

CREATE POLICY "Anyone can upload videos"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Anyone can read videos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'videos');

CREATE POLICY "Anyone can delete videos"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'videos');
