-- Part 1 - Core Schema
-- Run this in Supabase SQL Editor


-- ============ 20251118013100_create_multi_tenant_pos_schema_fixed.sql ============

/*
  # Multi-Tenant POS SaaS Database Schema

  ## Overview
  Complete database schema for a cloud-based Point of Sale SaaS system with multi-tenant architecture.

  ## 1. Core Tables
    - `tenants` - Store/business entities
    - `branches` - Physical store locations per tenant
    - `user_profiles` - Staff members with roles (owner, manager, cashier)
    - `customers` - Customer records per tenant

  ## 2. Product & Inventory Tables
    - `products` - Products with support for weight-based items and scale integration
    - `product_stocks` - Branch-level stock tracking

  ## 3. Membership & Loyalty Tables
    - `memberships` - Member cards with barcode scanning
    - `loyalty_settings` - Tenant-specific loyalty configuration
    - `loyalty_coin_balances` - Current coin balance per member

  ## 4. Promotion Tables
    ### Group Buy (Mix & Match)
    - `group_offers` - Mix & match promotion definitions
    - `group_offer_items` - Eligible products for group offers

    ### BOGO (Buy X Get Y)
    - `bogo_offers` - Buy X Get Y promotion definitions
    - `bogo_offer_buy_items` - Products that qualify for purchase requirement
    - `bogo_offer_get_items` - Products that can be received as reward

    ### Time-Based Discounts
    - `time_discounts` - Happy hour / time-based promotions

  ## 5. Sales Tables (created after promotions)
    - `sales` - Sales transactions with membership and loyalty integration
    - `sale_items` - Line items with weight support and promotion tracking
    - `loyalty_coin_transactions` - Earn/redeem transaction history
    - `sale_group_discounts` - Applied group discounts per sale
    - `sale_bogo_discounts` - Applied BOGO discounts per sale
    - `sale_time_discounts` - Applied time discounts per sale

  ## 6. Security
    - Row Level Security (RLS) enabled on all tables
    - Tenant isolation using auth.jwt() claims
    - Policies for authenticated users to access only their tenant's data
*/

-- =====================================================================
-- 1. TENANTS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  email text,
  phone text,
  address text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant"
  ON tenants FOR SELECT
  TO authenticated
  USING (id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can update own tenant"
  ON tenants FOR UPDATE
  TO authenticated
  USING (id = (auth.jwt()->>'tenant_id')::uuid)
  WITH CHECK (id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- 2. BRANCHES TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  address text,
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, code)
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant branches"
  ON branches FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can insert branches"
  ON branches FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can update branches"
  ON branches FOR UPDATE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can delete branches"
  ON branches FOR DELETE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- 3. USER PROFILES TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'cashier',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- 4. CUSTOMERS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant customers"
  ON customers FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- 5. PRODUCTS TABLE (with weight item support)
-- =====================================================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sku text NOT NULL,
  barcode text,
  name text NOT NULL,
  description text,
  category text,
  unit_type text NOT NULL DEFAULT 'piece',
  unit_label text NOT NULL DEFAULT 'pcs',
  price_per_unit numeric(10,2) NOT NULL DEFAULT 0,
  cost_per_unit numeric(10,2) DEFAULT 0,
  is_scale_item boolean DEFAULT false,
  scale_plu_code text,
  default_tare_weight numeric(10,3) DEFAULT 0,
  is_active boolean DEFAULT true,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_products_tenant_barcode ON products(tenant_id, barcode) WHERE barcode IS NOT NULL;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant products"
  ON products FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- 6. PRODUCT STOCKS TABLE (per branch)
-- =====================================================================
CREATE TABLE IF NOT EXISTS product_stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  quantity numeric(10,3) NOT NULL DEFAULT 0,
  min_stock_level numeric(10,3) DEFAULT 0,
  max_stock_level numeric(10,3) DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, branch_id)
);

ALTER TABLE product_stocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant product stocks"
  ON product_stocks FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can insert product stocks"
  ON product_stocks FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can update product stocks"
  ON product_stocks FOR UPDATE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can delete product stocks"
  ON product_stocks FOR DELETE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- 7. MEMBERSHIPS TABLE (with barcode support)
-- =====================================================================
CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  card_number text NOT NULL,
  card_barcode text NOT NULL,
  member_name text NOT NULL,
  member_email text,
  member_phone text,
  tier text DEFAULT 'standard',
  is_active boolean DEFAULT true,
  issued_date date DEFAULT CURRENT_DATE,
  expiry_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, card_number),
  UNIQUE(tenant_id, card_barcode)
);

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can insert memberships"
  ON memberships FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can update memberships"
  ON memberships FOR UPDATE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can delete memberships"
  ON memberships FOR DELETE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- 8. LOYALTY SETTINGS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS loyalty_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  is_enabled boolean DEFAULT true,
  earn_rate_value numeric(10,4) DEFAULT 0.01,
  redeem_value_per_coin numeric(10,2) DEFAULT 1.00,
  min_coins_to_redeem integer DEFAULT 10,
  max_coins_per_sale_percent numeric(5,2) DEFAULT 100.00,
  membership_barcode_prefix text DEFAULT 'MEM',
  membership_barcode_length integer DEFAULT 13,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE loyalty_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant loyalty settings"
  ON loyalty_settings FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can insert loyalty settings"
  ON loyalty_settings FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can update loyalty settings"
  ON loyalty_settings FOR UPDATE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- 9. LOYALTY COIN BALANCES TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS loyalty_coin_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  lifetime_earned integer DEFAULT 0,
  lifetime_redeemed integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(membership_id)
);

ALTER TABLE loyalty_coin_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant loyalty balances"
  ON loyalty_coin_balances FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can insert loyalty balances"
  ON loyalty_coin_balances FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can update loyalty balances"
  ON loyalty_coin_balances FOR UPDATE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- 10. GROUP OFFERS TABLE (Mix & Match)
-- =====================================================================
CREATE TABLE IF NOT EXISTS group_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  required_quantity integer NOT NULL,
  discount_type text NOT NULL,
  discount_value numeric(10,2) NOT NULL,
  is_active boolean DEFAULT true,
  start_date date,
  end_date date,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE group_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant group offers"
  ON group_offers FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can insert group offers"
  ON group_offers FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can update group offers"
  ON group_offers FOR UPDATE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can delete group offers"
  ON group_offers FOR DELETE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- 11. GROUP OFFER ITEMS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS group_offer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  group_offer_id uuid NOT NULL REFERENCES group_offers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(group_offer_id, product_id)
);

ALTER TABLE group_offer_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant group offer items"
  ON group_offer_items FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can insert group offer items"
  ON group_offer_items FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can delete group offer items"
  ON group_offer_items FOR DELETE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- 12. BOGO OFFERS TABLE (Buy X Get Y)
-- =====================================================================
CREATE TABLE IF NOT EXISTS bogo_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  buy_quantity integer NOT NULL,
  get_quantity integer NOT NULL,
  discount_type text NOT NULL,
  discount_value numeric(10,2) NOT NULL,
  apply_on text NOT NULL DEFAULT 'cheapest',
  is_active boolean DEFAULT true,
  start_date date,
  end_date date,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bogo_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant bogo offers"
  ON bogo_offers FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can insert bogo offers"
  ON bogo_offers FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can update bogo offers"
  ON bogo_offers FOR UPDATE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can delete bogo offers"
  ON bogo_offers FOR DELETE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- 13. BOGO OFFER BUY ITEMS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS bogo_offer_buy_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bogo_offer_id uuid NOT NULL REFERENCES bogo_offers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(bogo_offer_id, product_id)
);

ALTER TABLE bogo_offer_buy_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant bogo buy items"
  ON bogo_offer_buy_items FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can insert bogo buy items"
  ON bogo_offer_buy_items FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can delete bogo buy items"
  ON bogo_offer_buy_items FOR DELETE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- 14. BOGO OFFER GET ITEMS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS bogo_offer_get_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bogo_offer_id uuid NOT NULL REFERENCES bogo_offers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(bogo_offer_id, product_id)
);

ALTER TABLE bogo_offer_get_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant bogo get items"
  ON bogo_offer_get_items FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can insert bogo get items"
  ON bogo_offer_get_items FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can delete bogo get items"
  ON bogo_offer_get_items FOR DELETE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- 15. TIME DISCOUNTS TABLE (Happy Hour)
-- =====================================================================
CREATE TABLE IF NOT EXISTS time_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  discount_type text NOT NULL,
  discount_value numeric(10,2) NOT NULL,
  days_of_week integer[] NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  discount_scope text NOT NULL DEFAULT 'all',
  category text,
  is_active boolean DEFAULT true,
  start_date date,
  end_date date,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE time_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant time discounts"
  ON time_discounts FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can insert time discounts"
  ON time_discounts FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can update time discounts"
  ON time_discounts FOR UPDATE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can delete time discounts"
  ON time_discounts FOR DELETE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- 16. SALES TABLE (with loyalty integration)
-- =====================================================================
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  sale_number text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  membership_id uuid REFERENCES memberships(id) ON DELETE SET NULL,
  cashier_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  total_discount numeric(10,2) DEFAULT 0,
  loyalty_coins_earned integer DEFAULT 0,
  loyalty_coins_redeemed integer DEFAULT 0,
  loyalty_discount_amount numeric(10,2) DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  grand_total numeric(10,2) NOT NULL DEFAULT 0,
  payment_method text,
  payment_amount numeric(10,2) DEFAULT 0,
  change_amount numeric(10,2) DEFAULT 0,
  status text DEFAULT 'completed',
  notes text,
  sale_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, sale_number)
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant sales"
  ON sales FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can insert sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can update sales"
  ON sales FOR UPDATE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- 17. SALE ITEMS TABLE (with weight & promotion tracking)
-- =====================================================================
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  product_sku text NOT NULL,
  quantity numeric(10,3) NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  is_weight_item boolean DEFAULT false,
  measured_weight numeric(10,3),
  tare_weight numeric(10,3),
  is_scale_measured boolean DEFAULT false,
  line_subtotal numeric(10,2) NOT NULL,
  line_discount numeric(10,2) DEFAULT 0,
  group_offer_id uuid REFERENCES group_offers(id) ON DELETE SET NULL,
  group_instance_index integer,
  group_discount_share numeric(10,2) DEFAULT 0,
  bogo_offer_id uuid REFERENCES bogo_offers(id) ON DELETE SET NULL,
  bogo_instance_index integer,
  bogo_discount_share numeric(10,2) DEFAULT 0,
  time_discount_id uuid REFERENCES time_discounts(id) ON DELETE SET NULL,
  time_discount_amount numeric(10,2) DEFAULT 0,
  line_total numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant sale items"
  ON sale_items FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can insert sale items"
  ON sale_items FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- 18. LOYALTY COIN TRANSACTIONS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS loyalty_coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  transaction_type text NOT NULL,
  coins integer NOT NULL,
  balance_after integer NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE loyalty_coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant loyalty transactions"
  ON loyalty_coin_transactions FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can insert loyalty transactions"
  ON loyalty_coin_transactions FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- 19. SALE GROUP DISCOUNTS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS sale_group_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  group_offer_id uuid NOT NULL REFERENCES group_offers(id) ON DELETE CASCADE,
  instance_index integer NOT NULL,
  quantity_applied integer NOT NULL,
  discount_amount numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sale_group_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant sale group discounts"
  ON sale_group_discounts FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can insert sale group discounts"
  ON sale_group_discounts FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- 20. SALE BOGO DISCOUNTS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS sale_bogo_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  bogo_offer_id uuid NOT NULL REFERENCES bogo_offers(id) ON DELETE CASCADE,
  instance_index integer NOT NULL,
  buy_quantity integer NOT NULL,
  get_quantity integer NOT NULL,
  discount_amount numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sale_bogo_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant sale bogo discounts"
  ON sale_bogo_discounts FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can insert sale bogo discounts"
  ON sale_bogo_discounts FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- 21. SALE TIME DISCOUNTS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS sale_time_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  time_discount_id uuid NOT NULL REFERENCES time_discounts(id) ON DELETE CASCADE,
  discount_amount numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sale_time_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant sale time discounts"
  ON sale_time_discounts FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can insert sale time discounts"
  ON sale_time_discounts FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant ON user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_stocks_branch ON product_stocks(branch_id);
CREATE INDEX IF NOT EXISTS idx_memberships_tenant ON memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_memberships_barcode ON memberships(tenant_id, card_barcode);
CREATE INDEX IF NOT EXISTS idx_loyalty_balances_membership ON loyalty_coin_balances(membership_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_membership ON loyalty_coin_transactions(membership_id);
CREATE INDEX IF NOT EXISTS idx_sales_tenant ON sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_branch ON sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_group_offers_tenant ON group_offers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bogo_offers_tenant ON bogo_offers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_discounts_tenant ON time_discounts(tenant_id);

-- ============ 20251118020028_add_super_admin_and_subscriptions.sql ============

/*
  # Super Admin and Subscription Management System

  ## Overview
  Adds super admin functionality with business approval workflow and subscription packages.

  ## 1. New Tables
    - `super_admins` - Super admin users who can manage the platform
    - `subscription_packages` - Available subscription plans with features and limits
    - `tenant_subscriptions` - Active subscriptions for each tenant
    - `subscription_usage` - Track usage metrics for billing and limits

  ## 2. Modifications to Existing Tables
    - Add `status` and `approved_by` to tenants table for approval workflow
    - Add `subscription_id` to tenants table

  ## 3. Security
    - Super admins can access all data across tenants
    - RLS policies for super admin access
    - Regular users cannot access super admin tables

  ## Important Notes
    - Super admin is identified by `is_super_admin` flag in user_profiles
    - Tenants start as 'pending' and require approval
    - Subscription limits are enforced in application logic
*/

-- =====================================================================
-- 1. MODIFY TENANTS TABLE
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'status'
  ) THEN
    ALTER TABLE tenants ADD COLUMN status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE tenants ADD COLUMN approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE tenants ADD COLUMN approved_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'subscription_id'
  ) THEN
    ALTER TABLE tenants ADD COLUMN subscription_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'notes'
  ) THEN
    ALTER TABLE tenants ADD COLUMN notes text;
  END IF;
END $$;

-- =====================================================================
-- 2. MODIFY USER_PROFILES TABLE
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_super_admin'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_super_admin boolean DEFAULT false;
  END IF;
END $$;

-- =====================================================================
-- 3. SUBSCRIPTION PACKAGES TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS subscription_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  price_yearly numeric(10,2) NOT NULL DEFAULT 0,
  max_branches integer DEFAULT 1,
  max_users integer DEFAULT 5,
  max_products integer DEFAULT 100,
  max_sales_per_month integer DEFAULT 1000,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default packages
INSERT INTO subscription_packages (name, description, price_monthly, price_yearly, max_branches, max_users, max_products, max_sales_per_month, features, display_order)
VALUES
  ('Free Trial', 'Perfect for testing the system', 0, 0, 1, 2, 50, 100, '["Basic POS", "1 Branch", "2 Users", "50 Products", "100 Sales/month"]'::jsonb, 1),
  ('Starter', 'Great for small businesses', 29.99, 299.99, 1, 5, 500, 1000, '["Full POS Features", "1 Branch", "5 Users", "500 Products", "1000 Sales/month", "Promotions", "Loyalty Program"]'::jsonb, 2),
  ('Professional', 'For growing businesses', 79.99, 799.99, 5, 20, 2000, 5000, '["Full POS Features", "5 Branches", "20 Users", "2000 Products", "5000 Sales/month", "Promotions", "Loyalty Program", "Priority Support"]'::jsonb, 3),
  ('Enterprise', 'Unlimited potential', 199.99, 1999.99, 999, 999, 99999, 99999, '["Full POS Features", "Unlimited Branches", "Unlimited Users", "Unlimited Products", "Unlimited Sales", "Promotions", "Loyalty Program", "Priority Support", "Custom Features"]'::jsonb, 4)
ON CONFLICT DO NOTHING;

-- =====================================================================
-- 4. TENANT SUBSCRIPTIONS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES subscription_packages(id) ON DELETE RESTRICT,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  status text DEFAULT 'active',
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  auto_renew boolean DEFAULT true,
  payment_method text,
  last_payment_date timestamptz,
  next_payment_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================================
-- 5. SUBSCRIPTION USAGE TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS subscription_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_branches integer DEFAULT 0,
  total_users integer DEFAULT 0,
  total_products integer DEFAULT 0,
  total_sales integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, period_start)
);

-- =====================================================================
-- 6. ACTIVITY LOG TABLE (for super admin auditing)
-- =====================================================================
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- =====================================================================
-- 7. RLS POLICIES
-- =====================================================================

-- Update tenants policies to allow super admin access
DROP POLICY IF EXISTS "Users can view own tenant" ON tenants;
CREATE POLICY "Users can view own tenant"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    id = (auth.jwt()->>'tenant_id')::uuid 
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can update own tenant" ON tenants;
CREATE POLICY "Users can update own tenant"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    id = (auth.jwt()->>'tenant_id')::uuid 
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.is_super_admin = true
    )
  )
  WITH CHECK (
    id = (auth.jwt()->>'tenant_id')::uuid 
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.is_super_admin = true
    )
  );

-- Subscription Packages RLS
ALTER TABLE subscription_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active packages"
  ON subscription_packages FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Super admins can manage packages"
  ON subscription_packages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.is_super_admin = true
    )
  );

-- Tenant Subscriptions RLS
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON tenant_subscriptions FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.is_super_admin = true
    )
  );

CREATE POLICY "Super admins can manage subscriptions"
  ON tenant_subscriptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.is_super_admin = true
    )
  );

-- Subscription Usage RLS
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON subscription_usage FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.is_super_admin = true
    )
  );

CREATE POLICY "Super admins can manage usage"
  ON subscription_usage FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.is_super_admin = true
    )
  );

-- Activity Log RLS
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view activity log"
  ON admin_activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.is_super_admin = true
    )
  );

CREATE POLICY "Super admins can insert activity log"
  ON admin_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.is_super_admin = true
    )
  );

-- =====================================================================
-- 8. INDEXES
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription ON tenants(subscription_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant ON tenant_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status ON tenant_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_tenant ON subscription_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_period ON subscription_usage(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin ON admin_activity_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created ON admin_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_super_admin ON user_profiles(is_super_admin) WHERE is_super_admin = true;

-- ============ 20251118021722_fix_tenant_creation_rls.sql ============

/*
  # Fix Tenant Creation RLS Policy

  ## Problem
  New users cannot create tenants during signup because RLS policies block insertion.

  ## Solution
  Add INSERT policy that allows authenticated users to create tenants without requiring existing tenant_id.

  ## Changes
  - Add new INSERT policy for tenants table
  - Allow any authenticated user to create a tenant
  - Keep other policies restrictive for security
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert tenants" ON tenants;

-- Allow authenticated users to create new tenants (for signup)
CREATE POLICY "Users can insert tenants"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update the SELECT policy to be clearer
DROP POLICY IF EXISTS "Users can view own tenant" ON tenants;
CREATE POLICY "Users can view own tenant"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    id = (auth.jwt()->>'tenant_id')::uuid 
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.is_super_admin = true
    )
  );


-- ============ 20251118021737_fix_signup_rls_policies.sql ============

/*
  # Fix Signup RLS Policies

  ## Problem
  New users cannot complete signup flow due to RLS restrictions on branches and user_profiles.

  ## Solution
  Allow authenticated users to insert branches and user_profiles during initial setup.

  ## Changes
  - Update branches INSERT policy to allow creation without tenant context
  - Update user_profiles INSERT policy to be more permissive during signup
  - Maintain security for other operations
*/

-- =====================================================================
-- BRANCHES TABLE - Allow creation during signup
-- =====================================================================
DROP POLICY IF EXISTS "Users can insert branches" ON branches;

CREATE POLICY "Users can insert branches"
  ON branches FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================================
-- USER_PROFILES TABLE - Allow creation during signup
-- =====================================================================
DROP POLICY IF EXISTS "Users can insert profiles" ON user_profiles;

CREATE POLICY "Users can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow creating own profile
    id = auth.uid()
    -- Or if super admin is creating a profile
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.is_super_admin = true
    )
  );

-- =====================================================================
-- LOYALTY SETTINGS - Allow creation during signup
-- =====================================================================
DROP POLICY IF EXISTS "Users can insert loyalty settings" ON loyalty_settings;

CREATE POLICY "Users can insert loyalty settings"
  ON loyalty_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- ============ 20251118023015_add_foreign_key_indexes.sql ============

/*
  # Add Foreign Key Indexes for Performance Optimization

  1. Performance Improvements
    - Add indexes for all foreign key columns to optimize JOIN operations
    - Improves query performance for multi-tenant queries
    - Enhances referential integrity checks

  2. Indexes Added
    - BOGO offer buy/get items: product_id, tenant_id
    - Group offer items: product_id, tenant_id
    - Loyalty: tenant_id, sale_id, customer_id
    - Memberships: customer_id
    - Product stocks: tenant_id
    - Sales: cashier_id, customer_id, membership_id, branch_id, tenant_id
    - Sale items: product_id, tenant_id, offer IDs
    - Sale discounts: various foreign keys
    - Tenant subscriptions: package_id
    - Tenants: approved_by
    - User profiles: branch_id
*/

CREATE INDEX IF NOT EXISTS idx_bogo_buy_items_product ON bogo_offer_buy_items(product_id);
CREATE INDEX IF NOT EXISTS idx_bogo_buy_items_tenant ON bogo_offer_buy_items(tenant_id);

CREATE INDEX IF NOT EXISTS idx_bogo_get_items_product ON bogo_offer_get_items(product_id);
CREATE INDEX IF NOT EXISTS idx_bogo_get_items_tenant ON bogo_offer_get_items(tenant_id);

CREATE INDEX IF NOT EXISTS idx_group_offer_items_product ON group_offer_items(product_id);
CREATE INDEX IF NOT EXISTS idx_group_offer_items_tenant ON group_offer_items(tenant_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_balances_tenant ON loyalty_coin_balances(tenant_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_sale ON loyalty_coin_transactions(sale_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_tenant ON loyalty_coin_transactions(tenant_id);

CREATE INDEX IF NOT EXISTS idx_memberships_customer ON memberships(customer_id);

CREATE INDEX IF NOT EXISTS idx_product_stocks_tenant_fk ON product_stocks(tenant_id);

CREATE INDEX IF NOT EXISTS idx_sale_bogo_discounts_bogo ON sale_bogo_discounts(bogo_offer_id);
CREATE INDEX IF NOT EXISTS idx_sale_bogo_discounts_sale ON sale_bogo_discounts(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_bogo_discounts_tenant ON sale_bogo_discounts(tenant_id);

CREATE INDEX IF NOT EXISTS idx_sale_group_discounts_group ON sale_group_discounts(group_offer_id);
CREATE INDEX IF NOT EXISTS idx_sale_group_discounts_sale ON sale_group_discounts(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_group_discounts_tenant ON sale_group_discounts(tenant_id);

CREATE INDEX IF NOT EXISTS idx_sale_items_bogo ON sale_items(bogo_offer_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_group ON sale_items(group_offer_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_tenant_fk ON sale_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_time_discount ON sale_items(time_discount_id);

CREATE INDEX IF NOT EXISTS idx_sale_time_discounts_sale ON sale_time_discounts(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_time_discounts_tenant ON sale_time_discounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sale_time_discounts_time ON sale_time_discounts(time_discount_id);

CREATE INDEX IF NOT EXISTS idx_sales_cashier ON sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_membership ON sales(membership_id);

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_package ON tenant_subscriptions(package_id);

CREATE INDEX IF NOT EXISTS idx_tenants_approved_by ON tenants(approved_by);

CREATE INDEX IF NOT EXISTS idx_user_profiles_branch ON user_profiles(branch_id);


-- ============ 20251118023117_optimize_rls_policies_auth_functions.sql ============

/*
  # Optimize RLS Policies - Auth Function Performance

  1. Performance Optimization
    - Wrap all auth.uid() calls with (SELECT auth.uid())
    - Prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale

  2. Tables Updated
    - branches
    - user_profiles
    - customers
    - products
    - product_stocks
    - memberships
    - loyalty_settings
    - loyalty_coin_balances
    - loyalty_coin_transactions
    - group_offers
    - group_offer_items
    - bogo_offers
    - bogo_offer_buy_items
    - bogo_offer_get_items
    - time_discounts
    - sales
    - sale_items
    - sale_group_discounts
    - sale_bogo_discounts
    - sale_time_discounts
    - tenants
    - subscription_packages
    - tenant_subscriptions
    - subscription_usage
    - admin_activity_log
*/

DROP POLICY IF EXISTS "Users can view own tenant branches" ON branches;
CREATE POLICY "Users can view own tenant branches"
  ON branches FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update branches" ON branches;
CREATE POLICY "Users can update branches"
  ON branches FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can delete branches" ON branches;
CREATE POLICY "Users can delete branches"
  ON branches FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert profiles" ON user_profiles;
CREATE POLICY "Users can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own tenant customers" ON customers;
CREATE POLICY "Users can view own tenant customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert customers" ON customers;
CREATE POLICY "Users can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update customers" ON customers;
CREATE POLICY "Users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete customers" ON customers;
CREATE POLICY "Users can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant products" ON products;
CREATE POLICY "Users can view own tenant products"
  ON products FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert products" ON products;
CREATE POLICY "Users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update products" ON products;
CREATE POLICY "Users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete products" ON products;
CREATE POLICY "Users can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant product stocks" ON product_stocks;
CREATE POLICY "Users can view own tenant product stocks"
  ON product_stocks FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert product stocks" ON product_stocks;
CREATE POLICY "Users can insert product stocks"
  ON product_stocks FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update product stocks" ON product_stocks;
CREATE POLICY "Users can update product stocks"
  ON product_stocks FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete product stocks" ON product_stocks;
CREATE POLICY "Users can delete product stocks"
  ON product_stocks FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant memberships" ON memberships;
CREATE POLICY "Users can view own tenant memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert memberships" ON memberships;
CREATE POLICY "Users can insert memberships"
  ON memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update memberships" ON memberships;
CREATE POLICY "Users can update memberships"
  ON memberships FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete memberships" ON memberships;
CREATE POLICY "Users can delete memberships"
  ON memberships FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant loyalty settings" ON loyalty_settings;
CREATE POLICY "Users can view own tenant loyalty settings"
  ON loyalty_settings FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update loyalty settings" ON loyalty_settings;
CREATE POLICY "Users can update loyalty settings"
  ON loyalty_settings FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant loyalty balances" ON loyalty_coin_balances;
CREATE POLICY "Users can view own tenant loyalty balances"
  ON loyalty_coin_balances FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert loyalty balances" ON loyalty_coin_balances;
CREATE POLICY "Users can insert loyalty balances"
  ON loyalty_coin_balances FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update loyalty balances" ON loyalty_coin_balances;
CREATE POLICY "Users can update loyalty balances"
  ON loyalty_coin_balances FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant group offers" ON group_offers;
CREATE POLICY "Users can view own tenant group offers"
  ON group_offers FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert group offers" ON group_offers;
CREATE POLICY "Users can insert group offers"
  ON group_offers FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update group offers" ON group_offers;
CREATE POLICY "Users can update group offers"
  ON group_offers FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete group offers" ON group_offers;
CREATE POLICY "Users can delete group offers"
  ON group_offers FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant group offer items" ON group_offer_items;
CREATE POLICY "Users can view own tenant group offer items"
  ON group_offer_items FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert group offer items" ON group_offer_items;
CREATE POLICY "Users can insert group offer items"
  ON group_offer_items FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete group offer items" ON group_offer_items;
CREATE POLICY "Users can delete group offer items"
  ON group_offer_items FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant bogo offers" ON bogo_offers;
CREATE POLICY "Users can view own tenant bogo offers"
  ON bogo_offers FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert bogo offers" ON bogo_offers;
CREATE POLICY "Users can insert bogo offers"
  ON bogo_offers FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update bogo offers" ON bogo_offers;
CREATE POLICY "Users can update bogo offers"
  ON bogo_offers FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete bogo offers" ON bogo_offers;
CREATE POLICY "Users can delete bogo offers"
  ON bogo_offers FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant bogo buy items" ON bogo_offer_buy_items;
CREATE POLICY "Users can view own tenant bogo buy items"
  ON bogo_offer_buy_items FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert bogo buy items" ON bogo_offer_buy_items;
CREATE POLICY "Users can insert bogo buy items"
  ON bogo_offer_buy_items FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete bogo buy items" ON bogo_offer_buy_items;
CREATE POLICY "Users can delete bogo buy items"
  ON bogo_offer_buy_items FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant bogo get items" ON bogo_offer_get_items;
CREATE POLICY "Users can view own tenant bogo get items"
  ON bogo_offer_get_items FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert bogo get items" ON bogo_offer_get_items;
CREATE POLICY "Users can insert bogo get items"
  ON bogo_offer_get_items FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete bogo get items" ON bogo_offer_get_items;
CREATE POLICY "Users can delete bogo get items"
  ON bogo_offer_get_items FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant time discounts" ON time_discounts;
CREATE POLICY "Users can view own tenant time discounts"
  ON time_discounts FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert time discounts" ON time_discounts;
CREATE POLICY "Users can insert time discounts"
  ON time_discounts FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update time discounts" ON time_discounts;
CREATE POLICY "Users can update time discounts"
  ON time_discounts FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete time discounts" ON time_discounts;
CREATE POLICY "Users can delete time discounts"
  ON time_discounts FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant sales" ON sales;
CREATE POLICY "Users can view own tenant sales"
  ON sales FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert sales" ON sales;
CREATE POLICY "Users can insert sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update sales" ON sales;
CREATE POLICY "Users can update sales"
  ON sales FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant sale items" ON sale_items;
CREATE POLICY "Users can view own tenant sale items"
  ON sale_items FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert sale items" ON sale_items;
CREATE POLICY "Users can insert sale items"
  ON sale_items FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant loyalty transactions" ON loyalty_coin_transactions;
CREATE POLICY "Users can view own tenant loyalty transactions"
  ON loyalty_coin_transactions FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert loyalty transactions" ON loyalty_coin_transactions;
CREATE POLICY "Users can insert loyalty transactions"
  ON loyalty_coin_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant sale group discounts" ON sale_group_discounts;
CREATE POLICY "Users can view own tenant sale group discounts"
  ON sale_group_discounts FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert sale group discounts" ON sale_group_discounts;
CREATE POLICY "Users can insert sale group discounts"
  ON sale_group_discounts FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant sale bogo discounts" ON sale_bogo_discounts;
CREATE POLICY "Users can view own tenant sale bogo discounts"
  ON sale_bogo_discounts FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert sale bogo discounts" ON sale_bogo_discounts;
CREATE POLICY "Users can insert sale bogo discounts"
  ON sale_bogo_discounts FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant sale time discounts" ON sale_time_discounts;
CREATE POLICY "Users can view own tenant sale time discounts"
  ON sale_time_discounts FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert sale time discounts" ON sale_time_discounts;
CREATE POLICY "Users can insert sale time discounts"
  ON sale_time_discounts FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant" ON tenants;
CREATE POLICY "Users can view own tenant"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own tenant" ON tenants;
CREATE POLICY "Users can update own tenant"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Super admins can manage packages" ON subscription_packages;
CREATE POLICY "Super admins can manage packages"
  ON subscription_packages
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (SELECT auth.uid()) AND is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can view own subscription" ON tenant_subscriptions;
CREATE POLICY "Users can view own subscription"
  ON tenant_subscriptions FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can manage subscriptions" ON tenant_subscriptions;
CREATE POLICY "Super admins can manage subscriptions"
  ON tenant_subscriptions
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (SELECT auth.uid()) AND is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can view own usage" ON subscription_usage;
CREATE POLICY "Users can view own usage"
  ON subscription_usage FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can manage usage" ON subscription_usage;
CREATE POLICY "Super admins can manage usage"
  ON subscription_usage
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (SELECT auth.uid()) AND is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Super admins can view activity log" ON admin_activity_log;
CREATE POLICY "Super admins can view activity log"
  ON admin_activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (SELECT auth.uid()) AND is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Super admins can insert activity log" ON admin_activity_log;
CREATE POLICY "Super admins can insert activity log"
  ON admin_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (SELECT auth.uid()) AND is_super_admin = true
    )
  );
