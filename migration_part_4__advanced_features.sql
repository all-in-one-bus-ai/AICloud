-- Part 4 - Advanced Features
-- Run this in Supabase SQL Editor


-- ============ 20251216060504_fix_superadmin_feature_flags_access.sql ============

/*
  # Fix Super Admin Access to Feature Flags

  ## Changes
  1. Add policy to allow super admins to update any tenant's feature flags
  2. Ensure super admins can insert feature flags for new tenants

  ## Security
  - Super admins (is_super_admin = true) can manage all tenant feature flags
  - Regular owners can still manage their own tenant's flags
*/

-- Drop existing restrictive policy that blocks super admins
DROP POLICY IF EXISTS "Owners can update feature flags" ON tenant_feature_flags;
DROP POLICY IF EXISTS "System can insert feature flags" ON tenant_feature_flags;

-- Create new policies that allow both owners and super admins
CREATE POLICY "Owners and Super Admins can update feature flags"
  ON tenant_feature_flags FOR UPDATE
  TO authenticated
  USING (
    -- Allow if user is owner of this tenant
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
    OR
    -- Allow if user is super admin
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Allow both owners and super admins to insert feature flags
CREATE POLICY "Owners and Super Admins can insert feature flags"
  ON tenant_feature_flags FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is owner of this tenant
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
    OR
    -- Allow if user is super admin (can create for any tenant)
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );


-- ============ 20251216060652_add_subscription_plans.sql ============

/*
  # Add Subscription Plans

  ## New Tables
  1. `subscription_plans`
    - `id` (uuid, primary key)
    - `name` (text) - Plan name (e.g., Basic, Pro, Enterprise)
    - `description` (text) - Plan description
    - `price_monthly` (decimal) - Monthly price
    - `price_yearly` (decimal) - Yearly price
    - `features` (jsonb) - JSON object with feature flags
    - `max_users` (integer) - Maximum users allowed
    - `max_branches` (integer) - Maximum branches allowed
    - `is_active` (boolean) - Whether plan is available
    - `display_order` (integer) - Display order
    - `created_at` (timestamptz)

  ## Changes
  1. Add subscription_plans table
  2. Update tenants table to link to subscription plans
  3. Add default plans (Basic, Professional, Enterprise)

  ## Security
  - Only super admins can manage plans
  - All users can view available plans
*/

-- Create subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  price_monthly decimal(10,2) DEFAULT 0,
  price_yearly decimal(10,2) DEFAULT 0,
  features jsonb DEFAULT '{}'::jsonb,
  max_users integer DEFAULT 5,
  max_branches integer DEFAULT 1,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can view active plans
CREATE POLICY "Anyone can view active subscription plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only super admins can manage plans
CREATE POLICY "Super admins can insert plans"
  ON subscription_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "Super admins can update plans"
  ON subscription_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "Super admins can delete plans"
  ON subscription_plans FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Add plan_id to tenants if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'plan_id'
  ) THEN
    ALTER TABLE tenants ADD COLUMN plan_id uuid REFERENCES subscription_plans(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Insert default plans
INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, features, max_users, max_branches, display_order)
VALUES
  (
    'Basic',
    'Perfect for small businesses getting started',
    29.99,
    299.99,
    '{"feature_suppliers": true, "feature_expenses": true, "feature_staff": true, "feature_attendance": true, "feature_audit_logs": true, "feature_payroll": false, "feature_returns": true, "feature_gift_cards": true, "feature_invoices": true, "feature_credit_sales": true, "feature_advanced_reports": false, "feature_auto_reordering": false, "feature_restaurant_mode": false, "feature_ecommerce": false, "feature_api_access": false, "feature_warehouses": false, "feature_manufacturing": false, "feature_bookings": false, "feature_delivery": false, "feature_assets": false, "feature_documents": false, "feature_crm": false, "feature_tasks": false, "feature_email_marketing": false, "feature_self_checkout": false}'::jsonb,
    5,
    1,
    1
  ),
  (
    'Professional',
    'For growing businesses with advanced needs',
    79.99,
    799.99,
    '{"feature_suppliers": true, "feature_expenses": true, "feature_staff": true, "feature_attendance": true, "feature_audit_logs": true, "feature_payroll": true, "feature_returns": true, "feature_gift_cards": true, "feature_invoices": true, "feature_credit_sales": true, "feature_advanced_reports": true, "feature_auto_reordering": true, "feature_restaurant_mode": true, "feature_ecommerce": true, "feature_api_access": false, "feature_warehouses": true, "feature_manufacturing": false, "feature_bookings": true, "feature_delivery": true, "feature_assets": true, "feature_documents": true, "feature_crm": true, "feature_tasks": true, "feature_email_marketing": true, "feature_self_checkout": false}'::jsonb,
    25,
    5,
    2
  ),
  (
    'Enterprise',
    'Complete solution with all features unlocked',
    199.99,
    1999.99,
    '{"feature_suppliers": true, "feature_expenses": true, "feature_staff": true, "feature_attendance": true, "feature_audit_logs": true, "feature_payroll": true, "feature_returns": true, "feature_gift_cards": true, "feature_invoices": true, "feature_credit_sales": true, "feature_advanced_reports": true, "feature_auto_reordering": true, "feature_restaurant_mode": true, "feature_ecommerce": true, "feature_api_access": true, "feature_warehouses": true, "feature_manufacturing": true, "feature_bookings": true, "feature_delivery": true, "feature_assets": true, "feature_documents": true, "feature_crm": true, "feature_tasks": true, "feature_email_marketing": true, "feature_self_checkout": true}'::jsonb,
    999,
    999,
    3
  )
ON CONFLICT (name) DO NOTHING;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active, display_order);


-- ============ 20251216064049_seed_default_return_reasons.sql ============

/*
  # Seed Default Return Reasons
  
  ## Purpose
  Populate the return_reasons table with common return reasons for retail businesses
  
  ## Default Reasons
  - Defective/Damaged (no approval needed)
  - Wrong Item (no approval needed)
  - Changed Mind (manager approval required)
  - Not As Described (no approval needed)
  - Arrived Too Late (no approval needed)
  - Better Price Elsewhere (manager approval required)
  - Duplicate Order (no approval needed)
  - No Longer Needed (manager approval required)
  
  ## Notes
  - Uses ON CONFLICT to prevent duplicates
  - Only creates reasons if they don't already exist per tenant
  - Some reasons require manager approval for fraud prevention
*/

-- Insert default return reasons for existing tenants
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN SELECT id FROM tenants LOOP
    INSERT INTO return_reasons (tenant_id, reason, requires_manager_approval, is_active)
    VALUES
      (tenant_record.id, 'Defective/Damaged', false, true),
      (tenant_record.id, 'Wrong Item', false, true),
      (tenant_record.id, 'Changed Mind', true, true),
      (tenant_record.id, 'Not As Described', false, true),
      (tenant_record.id, 'Arrived Too Late', false, true),
      (tenant_record.id, 'Better Price Elsewhere', true, true),
      (tenant_record.id, 'Duplicate Order', false, true),
      (tenant_record.id, 'No Longer Needed', true, true)
    ON CONFLICT (tenant_id, reason) DO NOTHING;
  END LOOP;
END $$;


-- ============ 20251217152000_add_ai_forecasting_tables.sql ============

/*
  # AI Inventory Forecasting System

  1. New Tables
    - inventory_forecasts: AI-generated predictions for products with demand trends
    - reorder_recommendations: AI-suggested reorder quantities with confidence scores
    - forecast_alerts: Alert system for predicted stockouts and inventory issues

  2. Security
    - Enable RLS on all tables
    - Tenant members can view all data
    - Only managers and owners can create/update forecasts and recommendations

  3. Indexes for Performance
    - Indexes on tenant_id, product_id, forecast_date
    - Indexes on alert status and priority
*/

-- Inventory Forecasts Table
CREATE TABLE IF NOT EXISTS inventory_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  forecast_date date NOT NULL,
  predicted_demand decimal(10,2) NOT NULL DEFAULT 0,
  predicted_stockout_date date,
  confidence_score decimal(3,2) DEFAULT 0.75,
  trend_direction text CHECK (trend_direction IN ('increasing', 'decreasing', 'stable')),
  seasonal_factor decimal(5,2) DEFAULT 1.0,
  historical_accuracy decimal(3,2),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Reorder Recommendations Table
CREATE TABLE IF NOT EXISTS reorder_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  recommended_quantity decimal(10,2) NOT NULL,
  recommended_order_date date NOT NULL,
  expected_delivery_date date,
  estimated_cost decimal(10,2),
  confidence_score decimal(3,2) DEFAULT 0.75,
  reasoning text,
  priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  status text CHECK (status IN ('pending', 'accepted', 'rejected', 'ordered')) DEFAULT 'pending',
  accepted_by uuid REFERENCES auth.users(id),
  accepted_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Forecast Alerts Table
CREATE TABLE IF NOT EXISTS forecast_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  alert_type text CHECK (alert_type IN ('stockout_warning', 'overstock_warning', 'reorder_suggestion', 'trend_change', 'accuracy_issue')) NOT NULL,
  priority text CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  title text NOT NULL,
  message text NOT NULL,
  action_required boolean DEFAULT false,
  acknowledged boolean DEFAULT false,
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_forecasts_tenant_product ON inventory_forecasts(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_forecasts_date ON inventory_forecasts(forecast_date);
CREATE INDEX IF NOT EXISTS idx_inventory_forecasts_stockout ON inventory_forecasts(predicted_stockout_date) WHERE predicted_stockout_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reorder_recommendations_tenant ON reorder_recommendations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reorder_recommendations_status ON reorder_recommendations(status, priority);
CREATE INDEX IF NOT EXISTS idx_reorder_recommendations_product ON reorder_recommendations(product_id);

CREATE INDEX IF NOT EXISTS idx_forecast_alerts_tenant ON forecast_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_forecast_alerts_unacknowledged ON forecast_alerts(acknowledged) WHERE acknowledged = false;
CREATE INDEX IF NOT EXISTS idx_forecast_alerts_priority ON forecast_alerts(priority, created_at);

-- Enable Row Level Security
ALTER TABLE inventory_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reorder_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_forecasts
CREATE POLICY "Tenant members can view forecasts"
  ON inventory_forecasts FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "System can insert forecasts"
  ON inventory_forecasts FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "Managers can update forecasts"
  ON inventory_forecasts FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

-- RLS Policies for reorder_recommendations
CREATE POLICY "Tenant members can view recommendations"
  ON reorder_recommendations FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "System can insert recommendations"
  ON reorder_recommendations FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "Managers can update recommendations"
  ON reorder_recommendations FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

-- RLS Policies for forecast_alerts
CREATE POLICY "Tenant members can view alerts"
  ON forecast_alerts FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "System can insert alerts"
  ON forecast_alerts FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can acknowledge alerts"
  ON forecast_alerts FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- ============ 20251217154510_fix_signup_tenant_creation.sql ============

/*
  # Fix Tenant Creation During Signup
  
  ## Problem
  RLS policies are preventing tenant creation during signup even though the policy shows WITH CHECK (true).
  
  ## Solution
  1. Verify and recreate the INSERT policy for tenants
  2. Add a database function with SECURITY DEFINER to handle tenant creation
  3. Ensure the signup flow works end-to-end
  
  ## Changes
  - Drop and recreate tenant INSERT policy to ensure it's properly set
  - Add helper function for tenant creation during signup
*/

-- Ensure the tenants INSERT policy allows any authenticated user
DROP POLICY IF EXISTS "Users can insert tenants" ON tenants;

CREATE POLICY "Users can insert tenants"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Ensure branches INSERT policy allows during signup
DROP POLICY IF EXISTS "Users can insert branches" ON branches;

CREATE POLICY "Users can insert branches"
  ON branches FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Ensure user_profiles INSERT policy allows own profile creation
DROP POLICY IF EXISTS "Users can insert profiles" ON user_profiles;

CREATE POLICY "Users can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.is_super_admin = true
    )
  );


-- ============ 20251224044215_fix_tenant_select_after_signup.sql ============

/*
  # Fix Tenant SELECT After Signup
  
  ## Problem
  After successful signup, the SELECT policy on tenants blocks reading the newly created tenant.
  The user_profile exists but the policy evaluation fails during the immediate post-signup flow.
  
  ## Solution
  Make the tenant SELECT policy more permissive to allow users to read tenants they're associated with.
  
  ## Changes
  - Update tenant SELECT policy to work correctly after signup
  - Ensure users can read their associated tenant immediately after creation
*/

DROP POLICY IF EXISTS "Users can view own tenant" ON tenants;

CREATE POLICY "Users can view own tenant"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    -- User has a profile linked to this tenant
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.tenant_id = tenants.id
    )
    -- OR user is super admin
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.is_super_admin = true
    )
  );


-- ============ 20251224051556_fix_signup_with_secure_function.sql ============

/*
  # Fix Signup Process with Secure Function
  
  ## Problem
  During signup, auth.uid() may not be immediately available when trying to insert
  tenant, branch, and user_profile records, causing RLS policies to block the inserts.
  
  ## Solution
  Create a SECURITY DEFINER function that bypasses RLS to create all necessary records
  atomically after user authentication is confirmed.
  
  ## Changes
  1. Create a secure function to handle tenant/branch/profile creation
  2. Function runs with elevated privileges to bypass RLS
  3. Function validates that the calling user matches the profile being created
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS create_tenant_for_new_user(uuid, text, text, text, text);

-- Create function to set up tenant, branch, and profile for new user
CREATE OR REPLACE FUNCTION create_tenant_for_new_user(
  user_id uuid,
  user_email text,
  user_full_name text,
  business_name text,
  business_slug text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id uuid;
  new_branch_id uuid;
  result json;
BEGIN
  -- Verify the calling user matches the user_id (security check)
  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'Unauthorized: user_id does not match authenticated user';
  END IF;
  
  -- Check if user already has a profile (prevent duplicate signup)
  IF EXISTS (SELECT 1 FROM user_profiles WHERE id = user_id) THEN
    RAISE EXCEPTION 'User profile already exists';
  END IF;
  
  -- Insert tenant
  INSERT INTO tenants (name, slug, email, status)
  VALUES (business_name, business_slug, user_email, 'active')
  RETURNING id INTO new_tenant_id;
  
  -- Insert main branch
  INSERT INTO branches (tenant_id, name, code, is_active)
  VALUES (new_tenant_id, 'Main Branch', 'MAIN', true)
  RETURNING id INTO new_branch_id;
  
  -- Insert user profile
  INSERT INTO user_profiles (id, tenant_id, branch_id, email, full_name, role, is_active)
  VALUES (user_id, new_tenant_id, new_branch_id, user_email, user_full_name, 'owner', true);
  
  -- Insert default loyalty settings
  INSERT INTO loyalty_settings (tenant_id)
  VALUES (new_tenant_id)
  ON CONFLICT DO NOTHING;
  
  -- Return the created IDs
  result := json_build_object(
    'tenant_id', new_tenant_id,
    'branch_id', new_branch_id,
    'success', true
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  -- Roll back is automatic for functions
  RAISE EXCEPTION 'Failed to create tenant: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_tenant_for_new_user(uuid, text, text, text, text) TO authenticated;


-- ============ 20251224051903_add_feature_flags_to_signup_function.sql ============

/*
  # Add Feature Flags Creation to Signup Function
  
  ## Changes
  Update the signup function to also create default tenant_feature_flags
  This ensures all necessary records are created atomically during signup.
*/

-- Drop and recreate the function with feature flags creation
DROP FUNCTION IF EXISTS create_tenant_for_new_user(uuid, text, text, text, text);

CREATE OR REPLACE FUNCTION create_tenant_for_new_user(
  user_id uuid,
  user_email text,
  user_full_name text,
  business_name text,
  business_slug text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id uuid;
  new_branch_id uuid;
  result json;
BEGIN
  -- Verify the calling user matches the user_id (security check)
  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'Unauthorized: user_id does not match authenticated user';
  END IF;
  
  -- Check if user already has a profile (prevent duplicate signup)
  IF EXISTS (SELECT 1 FROM user_profiles WHERE id = user_id) THEN
    RAISE EXCEPTION 'User profile already exists';
  END IF;
  
  -- Insert tenant
  INSERT INTO tenants (name, slug, email, status)
  VALUES (business_name, business_slug, user_email, 'active')
  RETURNING id INTO new_tenant_id;
  
  -- Insert main branch
  INSERT INTO branches (tenant_id, name, code, is_active)
  VALUES (new_tenant_id, 'Main Branch', 'MAIN', true)
  RETURNING id INTO new_branch_id;
  
  -- Insert user profile
  INSERT INTO user_profiles (id, tenant_id, branch_id, email, full_name, role, is_active)
  VALUES (user_id, new_tenant_id, new_branch_id, user_email, user_full_name, 'owner', true);
  
  -- Insert default loyalty settings
  INSERT INTO loyalty_settings (tenant_id)
  VALUES (new_tenant_id)
  ON CONFLICT DO NOTHING;
  
  -- Insert default feature flags
  INSERT INTO tenant_feature_flags (tenant_id)
  VALUES (new_tenant_id)
  ON CONFLICT DO NOTHING;
  
  -- Return the created IDs
  result := json_build_object(
    'tenant_id', new_tenant_id,
    'branch_id', new_branch_id,
    'success', true
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  -- Roll back is automatic for functions
  RAISE EXCEPTION 'Failed to create tenant: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_tenant_for_new_user(uuid, text, text, text, text) TO authenticated;
