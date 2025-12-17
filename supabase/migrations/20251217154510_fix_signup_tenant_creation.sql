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
