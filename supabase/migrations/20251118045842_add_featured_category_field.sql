/*
  # Add Featured Category Field

  1. Changes
    - Add `is_featured_category` boolean field to products table
    - Default to false
    - Add index for faster filtering

  2. Notes
    - This allows marking certain categories as featured to show in POS
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'is_featured_category'
  ) THEN
    ALTER TABLE products ADD COLUMN is_featured_category boolean DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_featured_category ON products(is_featured_category) WHERE is_featured_category = true;