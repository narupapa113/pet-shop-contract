/*
  # flow_headerテーブルにtypeカラムを追加

  1. 変更内容
    - `flow_header`テーブルに`type`カラム（integer）を追加
    - デフォルト値は1（通常）
    - 1: 通常フロー、2: ワンタイムフロー
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flow_header' AND column_name = 'type'
  ) THEN
    ALTER TABLE flow_header ADD COLUMN type integer NOT NULL DEFAULT 1;
  END IF;
END $$;
