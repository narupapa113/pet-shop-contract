CREATE POLICY "allow_anon_select_documents" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'documents');
