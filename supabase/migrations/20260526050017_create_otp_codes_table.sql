/*
  # Create otp_codes table

  ## Summary
  ワンタイムURLの電話番号認証用OTPコード管理テーブルを作成します。

  ## New Tables
  - `otp_codes`
    - `id` (uuid, PK)
    - `onetime_id` (uuid, FK -> onetime_url_manage.id)
    - `phone` (text) - 電話番号
    - `code` (text) - 6桁コード
    - `expires_at` (timestamptz) - 有効期限（10分）
    - `used` (boolean) - 使用済みフラグ
    - `create_at` (timestamptz)

  ## Security
  - RLS enabled
  - Anon can insert and update (for OTP flow without login)
  - Authenticated users can read/manage
*/

CREATE TABLE IF NOT EXISTS otp_codes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  onetime_id  uuid        REFERENCES onetime_url_manage(id),
  phone       text        NOT NULL,
  code        text        NOT NULL,
  expires_at  timestamptz NOT NULL,
  used        boolean     NOT NULL DEFAULT false,
  create_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert otp codes"
  ON otp_codes FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update otp codes"
  ON otp_codes FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can read otp codes"
  ON otp_codes FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated can read otp codes"
  ON otp_codes FOR SELECT
  TO authenticated
  USING (true);
