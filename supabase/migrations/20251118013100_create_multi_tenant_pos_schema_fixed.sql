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