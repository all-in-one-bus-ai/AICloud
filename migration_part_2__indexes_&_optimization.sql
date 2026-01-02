-- Part 2 - Indexes & Optimization
-- Run this in Supabase SQL Editor


-- ============ 20251118023144_fix_multiple_permissive_policies.sql ============

/*
  # Fix Multiple Permissive Policies

  1. Issue Resolution
    - Combine multiple SELECT policies into single policies with OR conditions
    - Eliminates policy conflicts and improves clarity
    - Maintains same access control logic

  2. Tables Fixed
    - subscription_packages: Merge "Anyone can view" and "Super admins can manage"
    - tenant_subscriptions: Merge "Users can view own" and "Super admins can manage"
    - subscription_usage: Merge "Users can view own" and "Super admins can manage"

  3. Policy Logic
    - Regular users can view their own data
    - Super admins can view/manage all data
    - Single policy covers both cases
*/

DROP POLICY IF EXISTS "Anyone can view active packages" ON subscription_packages;
DROP POLICY IF EXISTS "Super admins can manage packages" ON subscription_packages;

CREATE POLICY "Users can view packages, admins can manage"
  ON subscription_packages FOR SELECT
  TO authenticated
  USING (
    is_active = true 
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (SELECT auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "Super admins can insert packages"
  ON subscription_packages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (SELECT auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "Super admins can update packages"
  ON subscription_packages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (SELECT auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "Super admins can delete packages"
  ON subscription_packages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (SELECT auth.uid()) AND is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can view own subscription" ON tenant_subscriptions;
DROP POLICY IF EXISTS "Super admins can manage subscriptions" ON tenant_subscriptions;

CREATE POLICY "Users can view subscriptions"
  ON tenant_subscriptions FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (SELECT auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "Super admins can insert subscriptions"
  ON tenant_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (SELECT auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "Super admins can update subscriptions"
  ON tenant_subscriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (SELECT auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "Super admins can delete subscriptions"
  ON tenant_subscriptions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (SELECT auth.uid()) AND is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can view own usage" ON subscription_usage;
DROP POLICY IF EXISTS "Super admins can manage usage" ON subscription_usage;

CREATE POLICY "Users can view usage"
  ON subscription_usage FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (SELECT auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "Super admins can insert usage"
  ON subscription_usage FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (SELECT auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "Super admins can update usage"
  ON subscription_usage FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (SELECT auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "Super admins can delete usage"
  ON subscription_usage FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (SELECT auth.uid()) AND is_super_admin = true
    )
  );


-- ============ 20251118045748_add_draft_carts_table.sql ============

/*
  # Add Draft Carts Table

  1. New Tables
    - `draft_carts`
      - `id` (uuid, primary key) - Unique identifier for the draft
      - `tenant_id` (uuid, foreign key) - Links to tenants table
      - `branch_id` (uuid, foreign key) - Links to branches table
      - `user_id` (uuid, foreign key) - User who created the draft
      - `cart_data` (jsonb) - Stores the cart items and metadata
      - `expires_at` (timestamptz) - Expiration time (24 hours from creation)
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `draft_carts` table
    - Add policies for authenticated users to manage their own drafts
    - Add policy to allow users to read drafts from their tenant/branch

  3. Indexes
    - Index on tenant_id and branch_id for fast lookups
    - Index on expires_at for cleanup operations
    - Index on user_id for user-specific queries
*/

CREATE TABLE IF NOT EXISTS draft_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cart_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 day'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE draft_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view drafts from their tenant"
  ON draft_carts FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own drafts"
  ON draft_carts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own drafts"
  ON draft_carts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own drafts"
  ON draft_carts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_draft_carts_tenant_branch ON draft_carts(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_draft_carts_expires_at ON draft_carts(expires_at);
CREATE INDEX IF NOT EXISTS idx_draft_carts_user_id ON draft_carts(user_id);

CREATE OR REPLACE FUNCTION delete_expired_drafts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM draft_carts WHERE expires_at < now();
END;
$$;

-- ============ 20251118045842_add_featured_category_field.sql ============

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

-- ============ 20251118051520_add_receipt_barcode_to_sales.sql ============

/*
  # Add Receipt Barcode to Sales

  1. Changes
    - Add `receipt_barcode` text field to sales table
    - Make it unique for lookups
    - Add index for fast searching

  2. Notes
    - This allows searching sales by barcode from receipts
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'receipt_barcode'
  ) THEN
    ALTER TABLE sales ADD COLUMN receipt_barcode text UNIQUE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sales_receipt_barcode ON sales(receipt_barcode);

-- ============ 20251124060351_add_product_enhancements_and_categories.sql ============

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

-- ============ 20251124062311_add_weight_items_and_favourites.sql ============

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