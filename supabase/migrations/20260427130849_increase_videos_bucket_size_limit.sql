/*
  # Increase videos storage bucket file size limit

  The default 50MB limit is too small for video files.
  Increase to 500MB (524288000 bytes).

  ## Changes
  - Update videos bucket file_size_limit to 500MB
*/

UPDATE storage.buckets
SET file_size_limit = 524288000
WHERE id = 'videos';
