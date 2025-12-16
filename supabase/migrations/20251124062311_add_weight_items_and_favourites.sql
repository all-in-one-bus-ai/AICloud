-- Weight-based Products and Favourites Enhancement
--
-- This migration adds support for:
-- 1. Weight-based products (loose items sold by kg, g, lb)
-- 2. Auto-generated barcodes
-- 3. Favourite categories with priority
-- 4. Minimum quantity steps for loose items
--
-- Changes to products table:
-- - is_weight_based (boolean) - whether product is sold by weight
-- - weight_unit (text) - kg, g, lb
-- - min_quantity_step (numeric) - minimum step for loose items
-- - barcode auto-generation support
--
-- Changes to categories table:
-- - is_favourite (boolean) - mark category as favourite
-- - favourite_priority (integer) - display order for favourites

-- Add weight-based fields to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'is_weight_based'
  ) THEN
    ALTER TABLE products ADD COLUMN is_weight_based boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'weight_unit'
  ) THEN
    ALTER TABLE products ADD COLUMN weight_unit text DEFAULT 'kg';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'min_quantity_step'
  ) THEN
    ALTER TABLE products ADD COLUMN min_quantity_step numeric DEFAULT 0.1;
  END IF;

  -- Ensure barcode column exists and has proper defaults
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'auto_generate_barcode'
  ) THEN
    ALTER TABLE products ADD COLUMN auto_generate_barcode boolean DEFAULT true;
  END IF;
END $$;

-- Add favourite fields to categories table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'is_favourite'
  ) THEN
    ALTER TABLE categories ADD COLUMN is_favourite boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'favourite_priority'
  ) THEN
    ALTER TABLE categories ADD COLUMN favourite_priority integer DEFAULT 0;
  END IF;
END $$;

-- Create index for weight-based products
CREATE INDEX IF NOT EXISTS idx_products_weight_based ON products(is_weight_based);
CREATE INDEX IF NOT EXISTS idx_categories_favourite ON categories(is_favourite, favourite_priority DESC);

-- Function to generate unique barcode
CREATE OR REPLACE FUNCTION generate_product_barcode()
RETURNS TEXT AS $$
DECLARE
  new_barcode TEXT;
  barcode_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 13-digit barcode starting with 2 (for internal use)
    new_barcode := '2' || LPAD(FLOOR(RANDOM() * 1000000000000)::TEXT, 12, '0');
    
    -- Check if barcode already exists
    SELECT EXISTS(SELECT 1 FROM products WHERE barcode = new_barcode) INTO barcode_exists;
    
    -- If unique, return it
    IF NOT barcode_exists THEN
      RETURN new_barcode;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate barcode if needed
CREATE OR REPLACE FUNCTION auto_generate_product_barcode()
RETURNS TRIGGER AS $$
BEGIN
  -- If barcode is empty and auto_generate is true, generate one
  IF (NEW.barcode IS NULL OR NEW.barcode = '') AND (NEW.auto_generate_barcode IS TRUE) THEN
    NEW.barcode := generate_product_barcode();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_auto_generate_barcode ON products;
CREATE TRIGGER trigger_auto_generate_barcode
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_product_barcode();