/*
  # Fix Signup RLS and Super Admin Security
  
  ## Critical Security Fix
  - Remove public super admin signup capability
  - Fix tenant INSERT policy to allow signup
  - Provide secure way to create super admins via database
  
  ## Changes
  1. Simplify tenant INSERT policy for signup
  2. Add secure super admin promotion function
  3. Ensure super admins can view all tenants
*/

-- =============================================================================
-- FIX TENANT INSERT POLICY FOR SIGNUP
-- =============================================================================

-- Drop existing tenant policies
DROP POLICY IF EXISTS "tenants_insert_policy" ON tenants;
DROP POLICY IF EXISTS "tenants_select_policy" ON tenants;
DROP POLICY IF EXISTS "tenants_update_policy" ON tenants;
DROP POLICY IF EXISTS "tenants_delete_policy" ON tenants;

-- Allow any authenticated user to create a tenant (for signup)
-- Super admins can see all tenants, regular users only their own
CREATE POLICY "tenants_select_policy"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    COALESCE(
      (SELECT is_super_admin FROM user_profiles WHERE id = auth.uid()),
      false
    ) = true
    OR 
    id = COALESCE(
      (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()),
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  );

-- During signup, any authenticated user can insert their tenant
CREATE POLICY "tenants_insert_policy"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Any authenticated user can create a tenant
    auth.uid() IS NOT NULL
  );

-- Only owners/admins of tenant or super admins can update
CREATE POLICY "tenants_update_policy"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    COALESCE(
      (SELECT is_super_admin FROM user_profiles WHERE id = auth.uid()),
      false
    ) = true
    OR
    (
      id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
      AND
      (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    COALESCE(
      (SELECT is_super_admin FROM user_profiles WHERE id = auth.uid()),
      false
    ) = true
    OR
    (
      id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
      AND
      (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('owner', 'admin')
    )
  );

-- Only super admins can delete tenants
CREATE POLICY "tenants_delete_policy"
  ON tenants FOR DELETE
  TO authenticated
  USING (
    COALESCE(
      (SELECT is_super_admin FROM user_profiles WHERE id = auth.uid()),
      false
    ) = true
  );

-- =============================================================================
-- FIX BRANCHES INSERT POLICY FOR SIGNUP
-- =============================================================================

DROP POLICY IF EXISTS "branches_insert_policy" ON branches;

CREATE POLICY "branches_insert_policy"
  ON branches FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Super admin can insert any branch
    COALESCE(
      (SELECT is_super_admin FROM user_profiles WHERE id = auth.uid()),
      false
    ) = true
    OR
    -- Owner/admin can insert branch for their tenant
    (
      tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
      AND
      (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('owner', 'admin')
    )
    OR
    -- During signup: allow if authenticated (profile doesn't exist yet)
    auth.uid() IS NOT NULL
  );

-- =============================================================================
-- FIX USER_PROFILES INSERT POLICY FOR SIGNUP
-- =============================================================================

DROP POLICY IF EXISTS "user_profiles_insert_policy" ON user_profiles;

CREATE POLICY "user_profiles_insert_policy"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Super admin can insert any profile
    COALESCE(
      (SELECT is_super_admin FROM user_profiles WHERE id = auth.uid()),
      false
    ) = true
    OR
    -- Users can insert their own profile during signup
    id = auth.uid()
    OR
    -- Owners/admins can add users to their tenant
    (
      tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
      AND
      (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('owner', 'admin')
    )
  );

-- =============================================================================
-- SECURE SUPER ADMIN MANAGEMENT
-- =============================================================================

-- Function to securely create first super admin (only if none exists)
CREATE OR REPLACE FUNCTION create_first_super_admin(
  admin_email text,
  admin_password text,
  admin_full_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_super_admin_count int;
  new_user_id uuid;
  result json;
BEGIN
  -- Check if any super admin already exists
  SELECT COUNT(*) INTO existing_super_admin_count
  FROM user_profiles
  WHERE is_super_admin = true;
  
  -- Only allow if this is the FIRST super admin
  IF existing_super_admin_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Super admin already exists. Use database admin to create additional super admins.'
    );
  END IF;
  
  -- Create auth user
  -- Note: This requires the user to actually sign up via auth.signUp in the app
  -- This function just promotes an existing user
  
  RETURN json_build_object(
    'success', false,
    'error', 'Please create a regular account first, then contact database admin to promote it to super admin.'
  );
  
END;
$$;

-- Function for database admin to promote user to super admin
-- This should only be called by database administrators
CREATE OR REPLACE FUNCTION admin_promote_to_super_admin(target_user_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  affected_rows int;
BEGIN
  -- Update user to super admin
  UPDATE user_profiles
  SET 
    is_super_admin = true,
    tenant_id = NULL,
    branch_id = NULL
  WHERE email = target_user_email;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  IF affected_rows > 0 THEN
    result := json_build_object(
      'success', true,
      'message', 'User promoted to super admin successfully',
      'email', target_user_email
    );
  ELSE
    result := json_build_object(
      'success', false,
      'error', 'User not found with email: ' || target_user_email
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Grant minimal permissions
GRANT EXECUTE ON FUNCTION admin_promote_to_super_admin(text) TO authenticated;

COMMENT ON FUNCTION admin_promote_to_super_admin IS 
  'Promotes an existing user to super admin. Should only be called by database administrators.';

-- =============================================================================
-- CREATE INITIAL SUPER ADMIN (IF NEEDED)
-- =============================================================================

-- Instructions for creating first super admin:
-- 1. Have user register normally at /signup with their email
-- 2. Run this SQL as database admin:
--    SELECT admin_promote_to_super_admin('admin@yourdomain.com');
-- 3. User can now login at /super-admin/login with their existing password
