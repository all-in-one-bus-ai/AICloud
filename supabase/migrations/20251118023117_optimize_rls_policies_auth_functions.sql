/*
  # Optimize RLS Policies - Auth Function Performance

  1. Performance Optimization
    - Wrap all auth.uid() calls with (SELECT auth.uid())
    - Prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale

  2. Tables Updated
    - branches
    - user_profiles
    - customers
    - products
    - product_stocks
    - memberships
    - loyalty_settings
    - loyalty_coin_balances
    - loyalty_coin_transactions
    - group_offers
    - group_offer_items
    - bogo_offers
    - bogo_offer_buy_items
    - bogo_offer_get_items
    - time_discounts
    - sales
    - sale_items
    - sale_group_discounts
    - sale_bogo_discounts
    - sale_time_discounts
    - tenants
    - subscription_packages
    - tenant_subscriptions
    - subscription_usage
    - admin_activity_log
*/

DROP POLICY IF EXISTS "Users can view own tenant branches" ON branches;
CREATE POLICY "Users can view own tenant branches"
  ON branches FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update branches" ON branches;
CREATE POLICY "Users can update branches"
  ON branches FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can delete branches" ON branches;
CREATE POLICY "Users can delete branches"
  ON branches FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert profiles" ON user_profiles;
CREATE POLICY "Users can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own tenant customers" ON customers;
CREATE POLICY "Users can view own tenant customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert customers" ON customers;
CREATE POLICY "Users can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update customers" ON customers;
CREATE POLICY "Users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete customers" ON customers;
CREATE POLICY "Users can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant products" ON products;
CREATE POLICY "Users can view own tenant products"
  ON products FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert products" ON products;
CREATE POLICY "Users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update products" ON products;
CREATE POLICY "Users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete products" ON products;
CREATE POLICY "Users can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant product stocks" ON product_stocks;
CREATE POLICY "Users can view own tenant product stocks"
  ON product_stocks FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert product stocks" ON product_stocks;
CREATE POLICY "Users can insert product stocks"
  ON product_stocks FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update product stocks" ON product_stocks;
CREATE POLICY "Users can update product stocks"
  ON product_stocks FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete product stocks" ON product_stocks;
CREATE POLICY "Users can delete product stocks"
  ON product_stocks FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant memberships" ON memberships;
CREATE POLICY "Users can view own tenant memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert memberships" ON memberships;
CREATE POLICY "Users can insert memberships"
  ON memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update memberships" ON memberships;
CREATE POLICY "Users can update memberships"
  ON memberships FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete memberships" ON memberships;
CREATE POLICY "Users can delete memberships"
  ON memberships FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant loyalty settings" ON loyalty_settings;
CREATE POLICY "Users can view own tenant loyalty settings"
  ON loyalty_settings FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update loyalty settings" ON loyalty_settings;
CREATE POLICY "Users can update loyalty settings"
  ON loyalty_settings FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant loyalty balances" ON loyalty_coin_balances;
CREATE POLICY "Users can view own tenant loyalty balances"
  ON loyalty_coin_balances FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert loyalty balances" ON loyalty_coin_balances;
CREATE POLICY "Users can insert loyalty balances"
  ON loyalty_coin_balances FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update loyalty balances" ON loyalty_coin_balances;
CREATE POLICY "Users can update loyalty balances"
  ON loyalty_coin_balances FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant group offers" ON group_offers;
CREATE POLICY "Users can view own tenant group offers"
  ON group_offers FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert group offers" ON group_offers;
CREATE POLICY "Users can insert group offers"
  ON group_offers FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update group offers" ON group_offers;
CREATE POLICY "Users can update group offers"
  ON group_offers FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete group offers" ON group_offers;
CREATE POLICY "Users can delete group offers"
  ON group_offers FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant group offer items" ON group_offer_items;
CREATE POLICY "Users can view own tenant group offer items"
  ON group_offer_items FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert group offer items" ON group_offer_items;
CREATE POLICY "Users can insert group offer items"
  ON group_offer_items FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete group offer items" ON group_offer_items;
CREATE POLICY "Users can delete group offer items"
  ON group_offer_items FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant bogo offers" ON bogo_offers;
CREATE POLICY "Users can view own tenant bogo offers"
  ON bogo_offers FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert bogo offers" ON bogo_offers;
CREATE POLICY "Users can insert bogo offers"
  ON bogo_offers FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update bogo offers" ON bogo_offers;
CREATE POLICY "Users can update bogo offers"
  ON bogo_offers FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete bogo offers" ON bogo_offers;
CREATE POLICY "Users can delete bogo offers"
  ON bogo_offers FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant bogo buy items" ON bogo_offer_buy_items;
CREATE POLICY "Users can view own tenant bogo buy items"
  ON bogo_offer_buy_items FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert bogo buy items" ON bogo_offer_buy_items;
CREATE POLICY "Users can insert bogo buy items"
  ON bogo_offer_buy_items FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete bogo buy items" ON bogo_offer_buy_items;
CREATE POLICY "Users can delete bogo buy items"
  ON bogo_offer_buy_items FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant bogo get items" ON bogo_offer_get_items;
CREATE POLICY "Users can view own tenant bogo get items"
  ON bogo_offer_get_items FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert bogo get items" ON bogo_offer_get_items;
CREATE POLICY "Users can insert bogo get items"
  ON bogo_offer_get_items FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete bogo get items" ON bogo_offer_get_items;
CREATE POLICY "Users can delete bogo get items"
  ON bogo_offer_get_items FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant time discounts" ON time_discounts;
CREATE POLICY "Users can view own tenant time discounts"
  ON time_discounts FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert time discounts" ON time_discounts;
CREATE POLICY "Users can insert time discounts"
  ON time_discounts FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update time discounts" ON time_discounts;
CREATE POLICY "Users can update time discounts"
  ON time_discounts FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete time discounts" ON time_discounts;
CREATE POLICY "Users can delete time discounts"
  ON time_discounts FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant sales" ON sales;
CREATE POLICY "Users can view own tenant sales"
  ON sales FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert sales" ON sales;
CREATE POLICY "Users can insert sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update sales" ON sales;
CREATE POLICY "Users can update sales"
  ON sales FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant sale items" ON sale_items;
CREATE POLICY "Users can view own tenant sale items"
  ON sale_items FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert sale items" ON sale_items;
CREATE POLICY "Users can insert sale items"
  ON sale_items FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant loyalty transactions" ON loyalty_coin_transactions;
CREATE POLICY "Users can view own tenant loyalty transactions"
  ON loyalty_coin_transactions FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert loyalty transactions" ON loyalty_coin_transactions;
CREATE POLICY "Users can insert loyalty transactions"
  ON loyalty_coin_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant sale group discounts" ON sale_group_discounts;
CREATE POLICY "Users can view own tenant sale group discounts"
  ON sale_group_discounts FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert sale group discounts" ON sale_group_discounts;
CREATE POLICY "Users can insert sale group discounts"
  ON sale_group_discounts FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant sale bogo discounts" ON sale_bogo_discounts;
CREATE POLICY "Users can view own tenant sale bogo discounts"
  ON sale_bogo_discounts FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert sale bogo discounts" ON sale_bogo_discounts;
CREATE POLICY "Users can insert sale bogo discounts"
  ON sale_bogo_discounts FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant sale time discounts" ON sale_time_discounts;
CREATE POLICY "Users can view own tenant sale time discounts"
  ON sale_time_discounts FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert sale time discounts" ON sale_time_discounts;
CREATE POLICY "Users can insert sale time discounts"
  ON sale_time_discounts FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own tenant" ON tenants;
CREATE POLICY "Users can view own tenant"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own tenant" ON tenants;
CREATE POLICY "Users can update own tenant"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Super admins can manage packages" ON subscription_packages;
CREATE POLICY "Super admins can manage packages"
  ON subscription_packages
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (SELECT auth.uid()) AND is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can view own subscription" ON tenant_subscriptions;
CREATE POLICY "Users can view own subscription"
  ON tenant_subscriptions FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can manage subscriptions" ON tenant_subscriptions;
CREATE POLICY "Super admins can manage subscriptions"
  ON tenant_subscriptions
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (SELECT auth.uid()) AND is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can view own usage" ON subscription_usage;
CREATE POLICY "Users can view own usage"
  ON subscription_usage FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can manage usage" ON subscription_usage;
CREATE POLICY "Super admins can manage usage"
  ON subscription_usage
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (SELECT auth.uid()) AND is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Super admins can view activity log" ON admin_activity_log;
CREATE POLICY "Super admins can view activity log"
  ON admin_activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (SELECT auth.uid()) AND is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Super admins can insert activity log" ON admin_activity_log;
CREATE POLICY "Super admins can insert activity log"
  ON admin_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (SELECT auth.uid()) AND is_super_admin = true
    )
  );
