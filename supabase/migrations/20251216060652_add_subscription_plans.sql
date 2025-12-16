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
