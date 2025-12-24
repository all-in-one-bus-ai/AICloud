/*
  # Recreate Signup Function with Explicit Parameters
  
  ## Changes
  Recreate the function with explicit IN parameter modes to ensure
  proper schema cache recognition by Supabase client library.
*/

-- Drop existing function
DROP FUNCTION IF EXISTS create_tenant_for_new_user(uuid, text, text, text, text);

-- Create function with explicit IN parameters
CREATE OR REPLACE FUNCTION create_tenant_for_new_user(
  IN user_id uuid,
  IN user_email text,
  IN user_full_name text,
  IN business_name text,
  IN business_slug text
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

-- Add comment for documentation
COMMENT ON FUNCTION create_tenant_for_new_user IS 'Creates tenant, branch, profile, and default settings for new user signup';
