DROP POLICY IF EXISTS "select_files" ON files;
CREATE POLICY "select_files" ON files FOR SELECT TO authenticated, anon USING (true);
