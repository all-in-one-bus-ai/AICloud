-- Product Enhancements and Categories System
--
-- Overview:
-- This migration adds comprehensive product management features including:
-- - Product favourites and priority ordering for POS display
-- - Product subtitle field for additional descriptions
-- - Stock quantity tracking integrated into products
-- - Categories table with full CRUD support
-- - Enhanced product organization
--
-- Changes:
--
-- 1. Products Table Enhancements
--    - subtitle (text) - Short description shown below product name
--    - is_favourite (boolean) - Mark product as favourite for POS
--    - favourite_priority (integer) - Controls display order (higher = top)
--    - stock_quantity (numeric) - Simplified stock tracking
--    - stock_status (text) - In Stock, Low Stock, Out of Stock
--    - category_id (uuid) - Foreign key to categories table
--
-- 2. Categories Table
--    - id, tenant_id, name, description, image_url
--    - display_order, is_active, created_at, updated_at
--
-- Security:
-- - Enable RLS on categories table
-- - Users can only access their tenant's categories
-- - Authenticated users can perform CRUD operations

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Add new columns to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'subtitle'
  ) THEN
    ALTER TABLE products ADD COLUMN subtitle text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'is_favourite'
  ) THEN
    ALTER TABLE products ADD COLUMN is_favourite boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'favourite_priority'
  ) THEN
    ALTER TABLE products ADD COLUMN favourite_priority integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'stock_quantity'
  ) THEN
    ALTER TABLE products ADD COLUMN stock_quantity numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'stock_status'
  ) THEN
    ALTER TABLE products ADD COLUMN stock_status text DEFAULT 'in_stock';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE products ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index on category_id for better query performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_favourite ON products(is_favourite, favourite_priority DESC);
CREATE INDEX IF NOT EXISTS idx_categories_tenant_id ON categories(tenant_id);

-- Enable RLS on categories table
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories table
CREATE POLICY "Users can view own tenant categories"
  ON categories FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert own tenant categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own tenant categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete own tenant categories"
  ON categories FOR DELETE
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
  ));