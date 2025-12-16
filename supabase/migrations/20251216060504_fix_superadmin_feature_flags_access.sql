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
