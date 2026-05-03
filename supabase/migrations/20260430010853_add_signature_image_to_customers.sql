DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'signature_image'
  ) THEN
    ALTER TABLE customers ADD COLUMN signature_image text;
  END IF;
END $$;