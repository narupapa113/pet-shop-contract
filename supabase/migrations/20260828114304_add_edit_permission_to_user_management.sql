-- function_id=10（ユーザー管理）の sub_id=3（編集）を、
-- 既に sub_id=2（新規追加）を持つ役割にバックフィルする
INSERT INTO authority_contents (id, function_id, sub_id, create_at, update_at)
SELECT
  ac.id,
  10 AS function_id,
  3 AS sub_id,
  now(),
  now()
FROM authority_contents ac
WHERE ac.function_id = 10
  AND ac.sub_id = 2
  AND NOT EXISTS (
    SELECT 1
    FROM authority_contents ac2
    WHERE ac2.id = ac.id
      AND ac2.function_id = 10
      AND ac2.sub_id = 3
  )
ON CONFLICT DO NOTHING;