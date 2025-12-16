/*
  # Fix Signup RLS Policies

  ## Problem
  New users cannot complete signup flow due to RLS restrictions on branches and user_profiles.

  ## Solution
  Allow authenticated users to insert branches and user_profiles during initial setup.

  ## Changes
  - Update branches INSERT policy to allow creation without tenant context
  - Update user_profiles INSERT policy to be more permissive during signup
  - Maintain security for other operations
*/

-- =====================================================================
-- BRANCHES TABLE - Allow creation during signup
-- =====================================================================
DROP POLICY IF EXISTS "Users can insert branches" ON branches;

CREATE POLICY "Users can insert branches"
  ON branches FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================================
-- USER_PROFILES TABLE - Allow creation during signup
-- =====================================================================
DROP POLICY IF EXISTS "Users can insert profiles" ON user_profiles;

CREATE POLICY "Users can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow creating own profile
    id = auth.uid()
    -- Or if super admin is creating a profile
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.is_super_admin = true
    )
  );

-- =====================================================================
-- LOYALTY SETTINGS - Allow creation during signup
-- =====================================================================
DROP POLICY IF EXISTS "Users can insert loyalty settings" ON loyalty_settings;

CREATE POLICY "Users can insert loyalty settings"
  ON loyalty_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);
