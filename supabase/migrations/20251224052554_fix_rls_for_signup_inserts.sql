/*
  # Fix RLS Policies for Signup Inserts
  
  ## Problem
  RLS policies were blocking initial signup inserts because policies checked
  for existing user_profiles records that don't exist yet during signup.
  
  ## Solution
  Update RLS policies to allow authenticated users to insert their own records
  during the signup flow while maintaining security.
  
  ## Changes
  1. Update tenants INSERT policy to allow authenticated users
  2. Update branches INSERT policy to check tenant ownership properly
  3. Ensure user_profiles INSERT policy allows self-creation
*/

-- Drop and recreate tenants INSERT policy
DROP POLICY IF EXISTS "Users can insert tenants" ON tenants;
CREATE POLICY "Users can insert tenants"
  ON tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is authenticated (they are creating their own tenant)
    auth.uid() IS NOT NULL
  );

-- Drop and recreate branches INSERT policy
DROP POLICY IF EXISTS "Users can insert branches" ON branches;
CREATE POLICY "Users can insert branches"
  ON branches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if the tenant was just created by this user OR user is owner/admin of tenant
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = tenant_id
      AND t.email = auth.email()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.tenant_id = tenant_id
      AND up.role IN ('owner', 'admin')
    )
  );

-- Ensure user_profiles INSERT policy allows self-creation
DROP POLICY IF EXISTS "Users can insert profiles" ON user_profiles;
CREATE POLICY "Users can insert profiles"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow inserting own profile OR super admin can insert any profile
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.is_super_admin = true
    )
  );
