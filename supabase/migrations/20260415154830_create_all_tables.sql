/*
  # 全テーブル作成マイグレーション

  ## 概要
  ペットショップ契約管理システムに必要な全テーブルを作成します。

  ## 作成テーブル一覧

  1. **m_authority** - 権限マスタ（依存なし）
  2. **authority_contents** - 権限管理（m_authority依存）
  3. **companys** - 企業管理（依存なし）
  4. **stores** - 店舗管理（companys依存）
  5. **users** - ユーザー（stores依存）
  6. **admins** - 管理者（m_authority・companys・stores依存）
  7. **customers** - 顧客管理（stores依存）
  8. **videos** - 動画管理（依存なし）
  9. **contract_templates_header** - 契約書テンプレートヘッダー（依存なし）
  10. **contract_templates_item** - 契約書テンプレート項目（contract_templates_header依存）
  11. **flow_header** - フローヘッダー（contract_templates_header依存）
  12. **flow_step** - フロー項目（flow_header・videos依存）
  13. **sign_history** - 署名履歴（customers・users・videos依存）
  14. **sign_input** - 署名入力情報（依存なし）
  15. **onetime_url_manage** - ワンタイムURL管理（flow_header・customers依存）
  16. **logs** - ログ保存（依存なし）

  ## セキュリティ
  - 全テーブルにRLSを有効化
  - 認証済みユーザーのみアクセス可能なポリシーを設定
*/

-- ================================================
-- 1. m_authority（権限マスタテーブル）
-- ================================================
CREATE TABLE IF NOT EXISTS m_authority (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_name  text        NOT NULL,
  create_at  timestamptz NOT NULL DEFAULT now(),
  update_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE m_authority ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view authority master"
  ON m_authority FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert authority master"
  ON m_authority FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update authority master"
  ON m_authority FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete authority master"
  ON m_authority FOR DELETE
  TO authenticated
  USING (true);

-- ================================================
-- 2. authority_contents（権限管理テーブル）
-- ================================================
CREATE TABLE IF NOT EXISTS authority_contents (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  function_id integer     NOT NULL,
  sub_id      integer     NOT NULL,
  create_at   timestamptz NOT NULL DEFAULT now(),
  update_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE authority_contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view authority contents"
  ON authority_contents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert authority contents"
  ON authority_contents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update authority contents"
  ON authority_contents FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete authority contents"
  ON authority_contents FOR DELETE
  TO authenticated
  USING (true);

-- ================================================
-- 3. companys（企業管理テーブル）
-- ================================================
CREATE TABLE IF NOT EXISTS companys (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  corporate_no text,
  create_at    timestamptz NOT NULL DEFAULT now(),
  update_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE companys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view companys"
  ON companys FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert companys"
  ON companys FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update companys"
  ON companys FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete companys"
  ON companys FOR DELETE
  TO authenticated
  USING (true);

-- ================================================
-- 4. stores（店舗管理テーブル）
-- ================================================
CREATE TABLE IF NOT EXISTS stores (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid        REFERENCES companys(id),
  name       text        NOT NULL,
  create_at  timestamptz NOT NULL DEFAULT now(),
  update_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stores"
  ON stores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert stores"
  ON stores FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update stores"
  ON stores FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete stores"
  ON stores FOR DELETE
  TO authenticated
  USING (true);

-- ================================================
-- 5. users（ユーザーテーブル）
-- ================================================
CREATE TABLE IF NOT EXISTS users (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  last_login_at timestamptz,
  store_id      uuid        REFERENCES stores(id),
  create_at     timestamptz NOT NULL DEFAULT now(),
  update_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (true);

-- ================================================
-- 6. admins（管理者テーブル）
-- ================================================
CREATE TABLE IF NOT EXISTS admins (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  auth_id       uuid        REFERENCES m_authority(id),
  last_login_at timestamptz,
  company_id    uuid        REFERENCES companys(id),
  store_id      uuid[]      NOT NULL DEFAULT '{}',
  create_at     timestamptz NOT NULL DEFAULT now(),
  update_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view admins"
  ON admins FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert admins"
  ON admins FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update admins"
  ON admins FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete admins"
  ON admins FOR DELETE
  TO authenticated
  USING (true);

-- ================================================
-- 7. customers（顧客管理テーブル）
-- ================================================
CREATE TABLE IF NOT EXISTS customers (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text        NOT NULL,
  name_kana          text,
  tell               text,
  mail               text,
  last_enter_store_at timestamptz,
  remarks            text,
  store_id           uuid        REFERENCES stores(id),
  create_at          timestamptz NOT NULL DEFAULT now(),
  update_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (true);

-- ================================================
-- 8. videos（動画テーブル）
-- ================================================
CREATE TABLE IF NOT EXISTS videos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  description text,
  path        text,
  video_time  integer,
  auth_hash   text,
  create_at   timestamptz NOT NULL DEFAULT now(),
  update_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view videos"
  ON videos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert videos"
  ON videos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update videos"
  ON videos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete videos"
  ON videos FOR DELETE
  TO authenticated
  USING (true);

-- ================================================
-- 9. contract_templates_header（契約書テンプレートヘッダー）
-- ================================================
CREATE TABLE IF NOT EXISTS contract_templates_header (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name      text        NOT NULL,
  create_at timestamptz NOT NULL DEFAULT now(),
  update_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contract_templates_header ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contract templates header"
  ON contract_templates_header FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert contract templates header"
  ON contract_templates_header FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update contract templates header"
  ON contract_templates_header FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete contract templates header"
  ON contract_templates_header FOR DELETE
  TO authenticated
  USING (true);

-- ================================================
-- 10. contract_templates_item（契約書テンプレート項目）
-- ================================================
CREATE TABLE IF NOT EXISTS contract_templates_item (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_no      integer     NOT NULL,
  item_name    text        NOT NULL,
  input_type   integer     NOT NULL,
  input_select text[]      NOT NULL DEFAULT '{}',
  placeholder  text,
  create_at    timestamptz NOT NULL DEFAULT now(),
  update_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contract_templates_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contract templates item"
  ON contract_templates_item FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert contract templates item"
  ON contract_templates_item FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update contract templates item"
  ON contract_templates_item FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete contract templates item"
  ON contract_templates_item FOR DELETE
  TO authenticated
  USING (true);

-- ================================================
-- 11. flow_header（フローヘッダー情報テーブル）
-- ================================================
CREATE TABLE IF NOT EXISTS flow_header (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text        NOT NULL,
  description          text,
  contract_template_id uuid        REFERENCES contract_templates_header(id),
  files                uuid[]      NOT NULL DEFAULT '{}',
  create_at            timestamptz NOT NULL DEFAULT now(),
  update_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE flow_header ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view flow header"
  ON flow_header FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert flow header"
  ON flow_header FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update flow header"
  ON flow_header FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete flow header"
  ON flow_header FOR DELETE
  TO authenticated
  USING (true);

-- ================================================
-- 12. flow_step（フロー項目情報テーブル）
-- ================================================
CREATE TABLE IF NOT EXISTS flow_step (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_step_no integer     NOT NULL,
  name         text        NOT NULL,
  type         integer     NOT NULL,
  video_id     uuid[]      NOT NULL DEFAULT '{}',
  create_at    timestamptz NOT NULL DEFAULT now(),
  update_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE flow_step ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view flow step"
  ON flow_step FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert flow step"
  ON flow_step FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update flow step"
  ON flow_step FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete flow step"
  ON flow_step FOR DELETE
  TO authenticated
  USING (true);

-- ================================================
-- 13. sign_history（署名履歴テーブル）
-- ================================================
CREATE TABLE IF NOT EXISTS sign_history (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id         uuid        NOT NULL,
  contract_name       text,
  support_stuff_id    uuid        REFERENCES users(id),
  sign_customer_id    uuid        REFERENCES customers(id),
  video_id            uuid[]      NOT NULL DEFAULT '{}',
  sign_path           text,
  create_at           timestamptz NOT NULL DEFAULT now(),
  update_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sign_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sign history"
  ON sign_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sign history"
  ON sign_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sign history"
  ON sign_history FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sign history"
  ON sign_history FOR DELETE
  TO authenticated
  USING (true);

-- ================================================
-- 14. sign_input（署名入力情報テーブル）
-- ================================================
CREATE TABLE IF NOT EXISTS sign_input (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sign_item_no    integer     NOT NULL,
  sign_item_value text,
  create_at       timestamptz NOT NULL DEFAULT now(),
  update_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sign_input ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sign input"
  ON sign_input FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sign input"
  ON sign_input FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sign input"
  ON sign_input FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sign input"
  ON sign_input FOR DELETE
  TO authenticated
  USING (true);

-- ================================================
-- 15. onetime_url_manage（ワンタイムURL管理テーブル）
-- ================================================
CREATE TABLE IF NOT EXISTS onetime_url_manage (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_at    timestamptz NOT NULL DEFAULT now(),
  flow_id     uuid        REFERENCES flow_header(id),
  onetime_url text,
  status      integer     NOT NULL DEFAULT 1,
  customer_id uuid        REFERENCES customers(id),
  create_at   timestamptz NOT NULL DEFAULT now(),
  update_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE onetime_url_manage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view onetime url manage"
  ON onetime_url_manage FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert onetime url manage"
  ON onetime_url_manage FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update onetime url manage"
  ON onetime_url_manage FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete onetime url manage"
  ON onetime_url_manage FOR DELETE
  TO authenticated
  USING (true);

-- ================================================
-- 16. logs（ログ保存テーブル）
-- ================================================
CREATE TABLE IF NOT EXISTS logs (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type      integer     NOT NULL,
  message   text,
  create_at timestamptz NOT NULL DEFAULT now(),
  update_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view logs"
  ON logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert logs"
  ON logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update logs"
  ON logs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete logs"
  ON logs FOR DELETE
  TO authenticated
  USING (true);
