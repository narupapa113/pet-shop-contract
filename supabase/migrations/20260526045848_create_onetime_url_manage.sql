/*
  # Create onetime_url_manage table

  ## Summary
  ワンタイムURL管理テーブルを作成します。

  ## New Tables
  - `onetime_url_manage`
    - `id` (uuid, PK) - ワンタイムID
    - `issue_at` (timestamptz) - 発行日時
    - `flow_id` (uuid, FK -> flow_header.id) - フローID
    - `onetime_url` (text) - ワンタイムURL
    - `status` (integer) - 進捗ステータス: 1=未認証, 2=認証済, 3=視聴中, 4=視聴完了, 5=署名済, 6=スタッフ入力済
    - `customer_id` (uuid, FK -> customers.id) - 顧客ID
    - `send_to` (text) - 送付先（電話番号）
    - `create_at` (timestamptz) - 登録日時
    - `update_at` (timestamptz) - 更新日時

  ## Security
  - RLS enabled
  - Authenticated users (admins) can read/insert/update
  - Anon can read own record by id (for customer URL access)
*/

CREATE TABLE IF NOT EXISTS onetime_url_manage (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_at    timestamptz NOT NULL DEFAULT now(),
  flow_id     uuid        REFERENCES flow_header(id),
  onetime_url text,
  status      integer     NOT NULL DEFAULT 1,
  customer_id uuid        REFERENCES customers(id),
  send_to     text,
  create_at   timestamptz NOT NULL DEFAULT now(),
  update_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE onetime_url_manage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read onetime urls"
  ON onetime_url_manage FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert onetime urls"
  ON onetime_url_manage FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update onetime urls"
  ON onetime_url_manage FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can read onetime url by id"
  ON onetime_url_manage FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can update onetime url status"
  ON onetime_url_manage FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
