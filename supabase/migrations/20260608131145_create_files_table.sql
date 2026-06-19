CREATE TABLE files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  path text NOT NULL,
  create_at timestamptz DEFAULT now(),
  update_at timestamptz DEFAULT now()
);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_files" ON files FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_files" ON files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_files" ON files FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_files" ON files FOR DELETE TO authenticated USING (true);
