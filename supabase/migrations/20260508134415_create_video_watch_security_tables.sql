/*
  # Create video watch security tables

  1. New Tables
    - `video_watch_sessions`
      - `session_key` (text) - フロントの一時セッションキー
      - `flow_id` (text) - フローID
      - `video_id` (uuid) - 視聴動画ID
      - `watched_sec` (integer) - 実視聴秒数
      - `required_sec` (integer) - 必要視聴秒数
      - `completed` (boolean) - 完了フラグ
    - `completion_tokens`
      - `token` (text, unique) - 30分有効なワンタイムトークン
      - `session_key` (text)
      - `flow_id` (text)
      - `used` (boolean) - 使用済みフラグ
      - `expires_at` (timestamptz)

  2. Security
    - RLS enabled on both tables
    - anon: video_watch_sessions に insert/update/select 可
    - anon: completion_tokens は select のみ（発行は server-side function が service role で行う）
*/

CREATE TABLE IF NOT EXISTS video_watch_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key text NOT NULL,
  flow_id text NOT NULL DEFAULT '',
  video_id uuid NOT NULL,
  watched_sec integer NOT NULL DEFAULT 0,
  required_sec integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_key, video_id)
);

CREATE INDEX IF NOT EXISTS idx_vws_session_flow ON video_watch_sessions(session_key, flow_id);

ALTER TABLE video_watch_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert watch sessions"
  ON video_watch_sessions FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update watch sessions"
  ON video_watch_sessions FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can view watch sessions"
  ON video_watch_sessions FOR SELECT TO anon USING (true);

CREATE TABLE IF NOT EXISTS completion_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  session_key text NOT NULL,
  flow_id text NOT NULL DEFAULT '',
  used boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ct_token ON completion_tokens(token);

ALTER TABLE completion_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can select completion tokens"
  ON completion_tokens FOR SELECT TO anon USING (true);