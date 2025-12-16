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