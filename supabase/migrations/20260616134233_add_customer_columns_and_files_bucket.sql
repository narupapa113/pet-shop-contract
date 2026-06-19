-- Add remarks2, remarks3, is_delete columns to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS remarks2 text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS remarks3 text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_delete boolean NOT NULL DEFAULT false;

-- Create "files" storage bucket for document uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('files', 'files', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Allow anonymous read (select/download) on files bucket
CREATE POLICY "anon_select_files_bucket" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'files');

-- Allow authenticated users full access
CREATE POLICY "auth_all_files_bucket" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'files')
  WITH CHECK (bucket_id = 'files');
