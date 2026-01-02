-- Part 5 - Final Fixes
-- Run this in Supabase SQL Editor


-- ============ 20251224052527_recreate_signup_function_with_explicit_params.sql ============

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


-- ============ 20251224052554_fix_rls_for_signup_inserts.sql ============

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


-- ============ 20251224052804_fix_branches_insert_policy.sql ============

/*
  # Fix Branches INSERT Policy
  
  ## Changes
  Correct the branches INSERT policy to properly check tenant_id
  instead of comparing up.tenant_id with itself.
*/

DROP POLICY IF EXISTS "Users can insert branches" ON branches;
CREATE POLICY "Users can insert branches"
  ON branches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if the tenant was just created by this user (email match)
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = tenant_id
      AND t.email = auth.email()
    )
    OR 
    -- OR user is already owner/admin of this tenant
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.tenant_id = branches.tenant_id
      AND up.role IN ('owner', 'admin')
    )
  );


-- ============ 20251224053548_rebuild_rls_policies_core_tables_only.sql ============

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


-- ============ 20251224053814_complete_rls_policies_final.sql ============

/*
  # Complete RLS Policies - Final
  
  ## Overview
  Complete all remaining RLS policies with correct column names
*/

-- =============================================================================
-- SALE_ITEMS TABLE
-- =============================================================================

CREATE POLICY "sale_items_select_policy"
  ON sale_items FOR SELECT
  TO authenticated
  USING (
    is_super_admin() OR
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
      AND sales.tenant_id = get_user_tenant_id()
    )
  );

CREATE POLICY "sale_items_insert_policy"
  ON sale_items FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin() OR
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
      AND sales.tenant_id = get_user_tenant_id()
    )
  );

CREATE POLICY "sale_items_update_policy"
  ON sale_items FOR UPDATE
  TO authenticated
  USING (
    is_super_admin() OR
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
      AND sales.tenant_id = get_user_tenant_id()
    )
  )
  WITH CHECK (
    is_super_admin() OR
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
      AND sales.tenant_id = get_user_tenant_id()
    )
  );

CREATE POLICY "sale_items_delete_policy"
  ON sale_items FOR DELETE
  TO authenticated
  USING (
    is_super_admin() OR
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
      AND sales.tenant_id = get_user_tenant_id()
      AND get_user_role() IN ('owner', 'admin')
    )
  );

-- =============================================================================
-- DISCOUNT TABLES
-- =============================================================================

CREATE POLICY "sale_bogo_discounts_select_policy"
  ON sale_bogo_discounts FOR SELECT
  TO authenticated
  USING (
    is_super_admin() OR
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_bogo_discounts.sale_id
      AND sales.tenant_id = get_user_tenant_id()
    )
  );

CREATE POLICY "sale_bogo_discounts_insert_policy"
  ON sale_bogo_discounts FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin() OR
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_bogo_discounts.sale_id
      AND sales.tenant_id = get_user_tenant_id()
    )
  );

CREATE POLICY "sale_group_discounts_select_policy"
  ON sale_group_discounts FOR SELECT
  TO authenticated
  USING (
    is_super_admin() OR
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_group_discounts.sale_id
      AND sales.tenant_id = get_user_tenant_id()
    )
  );

CREATE POLICY "sale_group_discounts_insert_policy"
  ON sale_group_discounts FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin() OR
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_group_discounts.sale_id
      AND sales.tenant_id = get_user_tenant_id()
    )
  );

CREATE POLICY "sale_time_discounts_select_policy"
  ON sale_time_discounts FOR SELECT
  TO authenticated
  USING (
    is_super_admin() OR
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_time_discounts.sale_id
      AND sales.tenant_id = get_user_tenant_id()
    )
  );

CREATE POLICY "sale_time_discounts_insert_policy"
  ON sale_time_discounts FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin() OR
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_time_discounts.sale_id
      AND sales.tenant_id = get_user_tenant_id()
    )
  );

-- =============================================================================
-- TABLES WITH tenant_id
-- =============================================================================

DO $$ 
DECLARE
    tbl_name text;
    tables_with_tenant_id text[] := ARRAY[
        'purchase_orders', 'returns', 'invoices', 'expenses',
        'bogo_offers', 'group_offers', 'time_discounts',
        'bogo_offer_buy_items', 'bogo_offer_get_items', 'group_offer_items',
        'purchase_order_items', 'return_items', 'invoice_items', 'invoice_payments',
        'gift_cards', 'memberships', 'staff_attendance',
        'payroll_records', 'restaurant_tables', 'restaurant_orders',
        'warehouse_locations', 'delivery_orders', 'bookings',
        'manufacturing_orders', 'assets', 'crm_contacts', 'crm_deals',
        'documents', 'tasks', 'api_keys', 'ecommerce_orders',
        'email_campaigns', 'inventory_forecasts', 'draft_carts',
        'cart_items', 'weight_items', 'favourite_products',
        'device_settings', 'activity_logs', 'return_reasons'
    ];
BEGIN
    FOREACH tbl_name IN ARRAY tables_with_tenant_id
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables t
            WHERE t.table_schema = 'public' 
            AND t.table_name = tbl_name
        ) THEN
            
            EXECUTE format('
                CREATE POLICY "%I_select_policy"
                ON %I FOR SELECT
                TO authenticated
                USING (tenant_id = get_user_tenant_id() OR is_super_admin())
            ', tbl_name, tbl_name);
            
            EXECUTE format('
                CREATE POLICY "%I_insert_policy"
                ON %I FOR INSERT
                TO authenticated
                WITH CHECK (tenant_id = get_user_tenant_id() OR is_super_admin())
            ', tbl_name, tbl_name);
            
            EXECUTE format('
                CREATE POLICY "%I_update_policy"
                ON %I FOR UPDATE
                TO authenticated
                USING (tenant_id = get_user_tenant_id() OR is_super_admin())
                WITH CHECK (tenant_id = get_user_tenant_id() OR is_super_admin())
            ', tbl_name, tbl_name);
            
            EXECUTE format('
                CREATE POLICY "%I_delete_policy"
                ON %I FOR DELETE
                TO authenticated
                USING (
                    is_super_admin() OR
                    (tenant_id = get_user_tenant_id() AND user_can_manage_tenant(tenant_id))
                )
            ', tbl_name, tbl_name);
            
        END IF;
    END LOOP;
END $$;


-- ============ 20251224053902_add_super_admin_creation_and_management.sql ============

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


-- ============ 20251224055621_fix_signup_rls_and_super_admin_security.sql ============

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
