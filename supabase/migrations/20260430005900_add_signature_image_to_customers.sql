/*
  # Add signature_image column to customers table

  ## Changes
  - `customers` table: add `signature_image` (text) column to store base64 PNG of the customer's electronic signature

  ## Notes
  - Column is nullable; existing rows are unaffected
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'signature_image'
  ) THEN
    ALTER TABLE customers ADD COLUMN signature_image text;
  END IF;
END $$;
