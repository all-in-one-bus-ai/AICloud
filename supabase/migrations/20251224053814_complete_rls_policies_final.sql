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
