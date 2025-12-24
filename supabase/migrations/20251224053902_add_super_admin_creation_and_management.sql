/*
  # Add Super Admin Creation and Management Functions
  
  ## Overview
  Provides functions to create and manage super admin users
  
  ## Functions
  1. create_super_admin - Creates a new super admin user (no tenant required)
  2. promote_to_super_admin - Promotes existing user to super admin
  3. Super admins can see all tenants and manage everything
*/

-- Function to create a super admin user profile
CREATE OR REPLACE FUNCTION create_super_admin(
  admin_user_id uuid,
  admin_email text,
  admin_full_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Check if user already has a profile
  IF EXISTS (SELECT 1 FROM user_profiles WHERE id = admin_user_id) THEN
    RAISE EXCEPTION 'User profile already exists';
  END IF;
  
  -- Create super admin profile (no tenant_id, no branch_id)
  INSERT INTO user_profiles (
    id, 
    email, 
    full_name, 
    role, 
    is_super_admin, 
    is_active
  ) VALUES (
    admin_user_id,
    admin_email,
    admin_full_name,
    'admin',
    true,
    true
  );
  
  result := json_build_object(
    'success', true,
    'message', 'Super admin created successfully'
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to create super admin: %', SQLERRM;
END;
$$;

-- Function to promote existing user to super admin
CREATE OR REPLACE FUNCTION promote_to_super_admin(user_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  affected_rows int;
BEGIN
  -- Update the user to be super admin
  UPDATE user_profiles
  SET is_super_admin = true
  WHERE email = user_email;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  IF affected_rows > 0 THEN
    result := json_build_object(
      'success', true, 
      'message', 'User promoted to super admin'
    );
  ELSE
    result := json_build_object(
      'success', false, 
      'message', 'User not found'
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_super_admin(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION promote_to_super_admin(text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_super_admin IS 'Creates a super admin user profile without tenant association';
COMMENT ON FUNCTION promote_to_super_admin IS 'Promotes an existing user to super admin status';

-- Modify user_profiles to allow null tenant_id and branch_id for super admins
ALTER TABLE user_profiles 
  ALTER COLUMN tenant_id DROP NOT NULL,
  ALTER COLUMN branch_id DROP NOT NULL;

-- Add constraint: regular users must have tenant_id, super admins don't need it
ALTER TABLE user_profiles
  ADD CONSTRAINT check_super_admin_or_tenant
  CHECK (
    (is_super_admin = true) OR 
    (is_super_admin = false AND tenant_id IS NOT NULL)
  );
