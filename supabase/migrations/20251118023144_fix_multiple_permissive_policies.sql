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
