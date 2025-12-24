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
