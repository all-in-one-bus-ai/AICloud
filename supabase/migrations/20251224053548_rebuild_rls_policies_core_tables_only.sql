/*
  # Rebuild All RLS Policies From Scratch - Core Tables Only
  
  ## Overview
  Complete rebuild of Row Level Security policies with clear, functional rules
  for multi-tenant POS system with role-based access control.
  
  ## Key Principles
  1. Super admins can see and manage everything
  2. Tenant owners/admins can manage their tenant data
  3. Staff can view and create within their tenant (limited updates/deletes)
  4. Cashiers have read-only access to products, can create sales
  5. During signup, authenticated users can create their own tenant
  
  ## Tables Covered
  - tenants
  - branches  
  - user_profiles
  - customers
  - suppliers
  - categories
  - products
  - product_stocks
  - sales
  - loyalty_settings
  - tenant_feature_flags
  - subscription_plans
*/

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Drop existing helper functions
DROP FUNCTION IF EXISTS is_super_admin();
DROP FUNCTION IF EXISTS get_user_role();
DROP FUNCTION IF EXISTS get_user_tenant_id();
DROP FUNCTION IF EXISTS user_can_manage_tenant(uuid);

-- Check if current user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND is_super_admin = true
  );
$$;

-- Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$;

-- Get current user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id FROM user_profiles WHERE id = auth.uid();
$$;

-- Check if user can manage a specific tenant (owner or admin)
CREATE OR REPLACE FUNCTION user_can_manage_tenant(tenant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND user_profiles.tenant_id = user_can_manage_tenant.tenant_id
    AND role IN ('owner', 'admin')
  );
$$;

-- =============================================================================
-- DROP ALL EXISTING RLS POLICIES
-- =============================================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on all tables
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename || ';';
    END LOOP;
END $$;

-- =============================================================================
-- TENANTS TABLE - Core tenant management
-- =============================================================================

CREATE POLICY "tenants_select_policy"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    is_super_admin() OR id = get_user_tenant_id()
  );

CREATE POLICY "tenants_insert_policy"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (
    -- During signup, any authenticated user can create a tenant
    -- OR super admin can create any tenant
    is_super_admin() OR auth.uid() IS NOT NULL
  );

CREATE POLICY "tenants_update_policy"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    is_super_admin() OR 
    (id = get_user_tenant_id() AND user_can_manage_tenant(id))
  )
  WITH CHECK (
    is_super_admin() OR 
    (id = get_user_tenant_id() AND user_can_manage_tenant(id))
  );

CREATE POLICY "tenants_delete_policy"
  ON tenants FOR DELETE
  TO authenticated
  USING (is_super_admin());

-- =============================================================================
-- BRANCHES TABLE - Branch management per tenant
-- =============================================================================

CREATE POLICY "branches_select_policy"
  ON branches FOR SELECT
  TO authenticated
  USING (
    is_super_admin() OR tenant_id = get_user_tenant_id()
  );

CREATE POLICY "branches_insert_policy"
  ON branches FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin() OR
    (tenant_id = get_user_tenant_id() AND user_can_manage_tenant(tenant_id)) OR
    -- During signup: allow if tenant with matching email exists
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = tenant_id AND t.email = auth.email()
    )
  );

CREATE POLICY "branches_update_policy"
  ON branches FOR UPDATE
  TO authenticated
  USING (
    is_super_admin() OR
    (tenant_id = get_user_tenant_id() AND user_can_manage_tenant(tenant_id))
  )
  WITH CHECK (
    is_super_admin() OR
    (tenant_id = get_user_tenant_id() AND user_can_manage_tenant(tenant_id))
  );

CREATE POLICY "branches_delete_policy"
  ON branches FOR DELETE
  TO authenticated
  USING (
    is_super_admin() OR
    (tenant_id = get_user_tenant_id() AND user_can_manage_tenant(tenant_id))
  );

-- =============================================================================
-- USER_PROFILES TABLE - User management
-- =============================================================================

CREATE POLICY "user_profiles_select_policy"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    is_super_admin() OR 
    tenant_id = get_user_tenant_id() OR
    id = auth.uid()
  );

CREATE POLICY "user_profiles_insert_policy"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Super admin can insert any profile
    is_super_admin() OR
    -- Users can insert their own profile during signup
    id = auth.uid() OR
    -- Owners/admins can add users to their tenant
    (tenant_id = get_user_tenant_id() AND user_can_manage_tenant(tenant_id))
  );

CREATE POLICY "user_profiles_update_policy"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    is_super_admin() OR
    id = auth.uid() OR
    (tenant_id = get_user_tenant_id() AND user_can_manage_tenant(tenant_id))
  )
  WITH CHECK (
    is_super_admin() OR
    id = auth.uid() OR
    (tenant_id = get_user_tenant_id() AND user_can_manage_tenant(tenant_id))
  );

CREATE POLICY "user_profiles_delete_policy"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (
    is_super_admin() OR
    (tenant_id = get_user_tenant_id() AND user_can_manage_tenant(tenant_id) AND id != auth.uid())
  );

-- =============================================================================
-- CUSTOMERS TABLE
-- =============================================================================

CREATE POLICY "customers_select_policy"
  ON customers FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id() OR is_super_admin());

CREATE POLICY "customers_insert_policy"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id() OR is_super_admin());

CREATE POLICY "customers_update_policy"
  ON customers FOR UPDATE
  TO authenticated
  USING (tenant_id = get_user_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = get_user_tenant_id() OR is_super_admin());

CREATE POLICY "customers_delete_policy"
  ON customers FOR DELETE
  TO authenticated
  USING (
    is_super_admin() OR
    (tenant_id = get_user_tenant_id() AND user_can_manage_tenant(tenant_id))
  );

-- =============================================================================
-- SUPPLIERS TABLE
-- =============================================================================

CREATE POLICY "suppliers_select_policy"
  ON suppliers FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id() OR is_super_admin());

CREATE POLICY "suppliers_insert_policy"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin() OR
    (tenant_id = get_user_tenant_id() AND get_user_role() IN ('owner', 'admin', 'manager'))
  );

CREATE POLICY "suppliers_update_policy"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (
    is_super_admin() OR
    (tenant_id = get_user_tenant_id() AND get_user_role() IN ('owner', 'admin', 'manager'))
  )
  WITH CHECK (
    is_super_admin() OR
    (tenant_id = get_user_tenant_id() AND get_user_role() IN ('owner', 'admin', 'manager'))
  );

CREATE POLICY "suppliers_delete_policy"
  ON suppliers FOR DELETE
  TO authenticated
  USING (
    is_super_admin() OR
    (tenant_id = get_user_tenant_id() AND user_can_manage_tenant(tenant_id))
  );

-- =============================================================================
-- CATEGORIES TABLE
-- =============================================================================

CREATE POLICY "categories_select_policy"
  ON categories FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id() OR is_super_admin());

CREATE POLICY "categories_insert_policy"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin() OR
    (tenant_id = get_user_tenant_id() AND get_user_role() IN ('owner', 'admin', 'manager'))
  );

CREATE POLICY "categories_update_policy"
  ON categories FOR UPDATE
  TO authenticated
  USING (
    is_super_admin() OR
    (tenant_id = get_user_tenant_id() AND get_user_role() IN ('owner', 'admin', 'manager'))
  )
  WITH CHECK (
    is_super_admin() OR
    (tenant_id = get_user_tenant_id() AND get_user_role() IN ('owner', 'admin', 'manager'))
  );

CREATE POLICY "categories_delete_policy"
  ON categories FOR DELETE
  TO authenticated
  USING (
    is_super_admin() OR
    (tenant_id = get_user_tenant_id() AND user_can_manage_tenant(tenant_id))
  );

-- =============================================================================
-- PRODUCTS TABLE
-- =============================================================================

CREATE POLICY "products_select_policy"
  ON products FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id() OR is_super_admin());

CREATE POLICY "products_insert_policy"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin() OR
    (tenant_id = get_user_tenant_id() AND get_user_role() IN ('owner', 'admin', 'manager'))
  );

CREATE POLICY "products_update_policy"
  ON products FOR UPDATE
  TO authenticated
  USING (
    is_super_admin() OR
    (tenant_id = get_user_tenant_id() AND get_user_role() IN ('owner', 'admin', 'manager'))
  )
  WITH CHECK (
    is_super_admin() OR
    (tenant_id = get_user_tenant_id() AND get_user_role() IN ('owner', 'admin', 'manager'))
  );

CREATE POLICY "products_delete_policy"
  ON products FOR DELETE
  TO authenticated
  USING (
    is_super_admin() OR
    (tenant_id = get_user_tenant_id() AND user_can_manage_tenant(tenant_id))
  );

-- =============================================================================
-- PRODUCT_STOCKS TABLE
-- =============================================================================

CREATE POLICY "product_stocks_select_policy"
  ON product_stocks FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id() OR is_super_admin());

CREATE POLICY "product_stocks_insert_policy"
  ON product_stocks FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id() OR is_super_admin());

CREATE POLICY "product_stocks_update_policy"
  ON product_stocks FOR UPDATE
  TO authenticated
  USING (tenant_id = get_user_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = get_user_tenant_id() OR is_super_admin());

CREATE POLICY "product_stocks_delete_policy"
  ON product_stocks FOR DELETE
  TO authenticated
  USING (
    is_super_admin() OR
    (tenant_id = get_user_tenant_id() AND user_can_manage_tenant(tenant_id))
  );

-- =============================================================================
-- SALES TABLE
-- =============================================================================

CREATE POLICY "sales_select_policy"
  ON sales FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id() OR is_super_admin());

CREATE POLICY "sales_insert_policy"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id() OR is_super_admin());

CREATE POLICY "sales_update_policy"
  ON sales FOR UPDATE
  TO authenticated
  USING (tenant_id = get_user_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = get_user_tenant_id() OR is_super_admin());

CREATE POLICY "sales_delete_policy"
  ON sales FOR DELETE
  TO authenticated
  USING (
    is_super_admin() OR
    (tenant_id = get_user_tenant_id() AND user_can_manage_tenant(tenant_id))
  );

-- =============================================================================
-- LOYALTY_SETTINGS TABLE
-- =============================================================================

CREATE POLICY "loyalty_settings_select_policy"
  ON loyalty_settings FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id() OR is_super_admin());

CREATE POLICY "loyalty_settings_insert_policy"
  ON loyalty_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id() OR is_super_admin()
  );

CREATE POLICY "loyalty_settings_update_policy"
  ON loyalty_settings FOR UPDATE
  TO authenticated
  USING (
    is_super_admin() OR
    (tenant_id = get_user_tenant_id() AND user_can_manage_tenant(tenant_id))
  )
  WITH CHECK (
    is_super_admin() OR
    (tenant_id = get_user_tenant_id() AND user_can_manage_tenant(tenant_id))
  );

-- =============================================================================
-- TENANT_FEATURE_FLAGS TABLE
-- =============================================================================

CREATE POLICY "feature_flags_select_policy"
  ON tenant_feature_flags FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id() OR is_super_admin());

CREATE POLICY "feature_flags_insert_policy"
  ON tenant_feature_flags FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id() OR is_super_admin()
  );

CREATE POLICY "feature_flags_update_policy"
  ON tenant_feature_flags FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- =============================================================================
-- SUBSCRIPTION_PLANS TABLE (if exists)
-- =============================================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_plans') THEN
    EXECUTE 'CREATE POLICY "subscription_plans_select_policy"
      ON subscription_plans FOR SELECT
      TO authenticated
      USING (true)';
    
    EXECUTE 'CREATE POLICY "subscription_plans_insert_policy"
      ON subscription_plans FOR INSERT
      TO authenticated
      WITH CHECK (is_super_admin())';
    
    EXECUTE 'CREATE POLICY "subscription_plans_update_policy"
      ON subscription_plans FOR UPDATE
      TO authenticated
      USING (is_super_admin())
      WITH CHECK (is_super_admin())';
    
    EXECUTE 'CREATE POLICY "subscription_plans_delete_policy"
      ON subscription_plans FOR DELETE
      TO authenticated
      USING (is_super_admin())';
  END IF;
END $$;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION user_can_manage_tenant(uuid) TO authenticated;
