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
