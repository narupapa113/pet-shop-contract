/*
  # Allow anon access to flow_header and flow_step

  1. Changes
    - flow_header と flow_step テーブルへの anon ロールアクセスを許可
    - 既存の authenticated ポリシーは維持し、anon 用ポリシーを追加

  2. Security
    - このアプリはSupabase Auth未使用のため anon ロールで動作する
    - 既存の authenticated ポリシーと並立して anon ポリシーを追加
*/

CREATE POLICY "Anon users can view flow header"
  ON flow_header FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert flow header"
  ON flow_header FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update flow header"
  ON flow_header FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon users can delete flow header"
  ON flow_header FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Anon users can view flow step"
  ON flow_step FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert flow step"
  ON flow_step FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update flow step"
  ON flow_step FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon users can delete flow step"
  ON flow_step FOR DELETE
  TO anon
  USING (true);
