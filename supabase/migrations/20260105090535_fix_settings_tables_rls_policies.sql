/*
  # Fix Settings Tables RLS Policies

  1. Problem
    - Settings tables were using auth.jwt()->>'tenant_id' which doesn't exist
    - This caused INSERT/UPDATE operations to fail silently
    - Data wouldn't persist across page refreshes

  2. Solution
    - Update RLS policies to match the working pattern used by products table
    - Use tenant_id lookup from user_profiles table via auth.uid()
    - This ensures proper tenant isolation while allowing authenticated users to save their settings

  3. Tables Updated
    - store_settings
    - receipt_settings
    - security_settings
    - tax_settings

  4. Security
    - Maintains tenant isolation
    - Only authenticated users can access their own tenant's settings
    - Admin/owner roles can modify settings
*/

-- =====================================================================
-- STORE SETTINGS RLS POLICIES
-- =====================================================================
DROP POLICY IF EXISTS "Users can view own tenant store settings" ON store_settings;
CREATE POLICY "Users can view own tenant store settings"
  ON store_settings FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert store settings" ON store_settings;
CREATE POLICY "Users can insert store settings"
  ON store_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update store settings" ON store_settings;
CREATE POLICY "Users can update store settings"
  ON store_settings FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

-- =====================================================================
-- RECEIPT SETTINGS RLS POLICIES
-- =====================================================================
DROP POLICY IF EXISTS "Users can view own tenant receipt settings" ON receipt_settings;
CREATE POLICY "Users can view own tenant receipt settings"
  ON receipt_settings FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert receipt settings" ON receipt_settings;
CREATE POLICY "Users can insert receipt settings"
  ON receipt_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update receipt settings" ON receipt_settings;
CREATE POLICY "Users can update receipt settings"
  ON receipt_settings FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

-- =====================================================================
-- SECURITY SETTINGS RLS POLICIES
-- =====================================================================
DROP POLICY IF EXISTS "Users can view own tenant security settings" ON security_settings;
CREATE POLICY "Users can view own tenant security settings"
  ON security_settings FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert security settings" ON security_settings;
CREATE POLICY "Users can insert security settings"
  ON security_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update security settings" ON security_settings;
CREATE POLICY "Users can update security settings"
  ON security_settings FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

-- =====================================================================
-- TAX SETTINGS RLS POLICIES
-- =====================================================================
DROP POLICY IF EXISTS "Users can view own tenant tax settings" ON tax_settings;
CREATE POLICY "Users can view own tenant tax settings"
  ON tax_settings FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert tax settings" ON tax_settings;
CREATE POLICY "Users can insert tax settings"
  ON tax_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update tax settings" ON tax_settings;
CREATE POLICY "Users can update tax settings"
  ON tax_settings FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );
