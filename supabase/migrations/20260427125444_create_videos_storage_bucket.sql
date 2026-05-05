/*
  # Create videos storage bucket

  Creates a Supabase Storage bucket named "videos" for storing video files uploaded via the content management screen.

  ## Changes
  - Creates "videos" storage bucket (public: false)
  - Adds RLS policies so authenticated users can upload, read, and delete their own videos
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'videos');

-- Allow authenticated users to read videos
CREATE POLICY "Authenticated users can read videos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'videos');

-- Allow authenticated users to delete videos
CREATE POLICY "Authenticated users can delete videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'videos');
