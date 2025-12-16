/*
  # Add Foreign Key Indexes for Performance Optimization

  1. Performance Improvements
    - Add indexes for all foreign key columns to optimize JOIN operations
    - Improves query performance for multi-tenant queries
    - Enhances referential integrity checks

  2. Indexes Added
    - BOGO offer buy/get items: product_id, tenant_id
    - Group offer items: product_id, tenant_id
    - Loyalty: tenant_id, sale_id, customer_id
    - Memberships: customer_id
    - Product stocks: tenant_id
    - Sales: cashier_id, customer_id, membership_id, branch_id, tenant_id
    - Sale items: product_id, tenant_id, offer IDs
    - Sale discounts: various foreign keys
    - Tenant subscriptions: package_id
    - Tenants: approved_by
    - User profiles: branch_id
*/

CREATE INDEX IF NOT EXISTS idx_bogo_buy_items_product ON bogo_offer_buy_items(product_id);
CREATE INDEX IF NOT EXISTS idx_bogo_buy_items_tenant ON bogo_offer_buy_items(tenant_id);

CREATE INDEX IF NOT EXISTS idx_bogo_get_items_product ON bogo_offer_get_items(product_id);
CREATE INDEX IF NOT EXISTS idx_bogo_get_items_tenant ON bogo_offer_get_items(tenant_id);

CREATE INDEX IF NOT EXISTS idx_group_offer_items_product ON group_offer_items(product_id);
CREATE INDEX IF NOT EXISTS idx_group_offer_items_tenant ON group_offer_items(tenant_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_balances_tenant ON loyalty_coin_balances(tenant_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_sale ON loyalty_coin_transactions(sale_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_tenant ON loyalty_coin_transactions(tenant_id);

CREATE INDEX IF NOT EXISTS idx_memberships_customer ON memberships(customer_id);

CREATE INDEX IF NOT EXISTS idx_product_stocks_tenant_fk ON product_stocks(tenant_id);

CREATE INDEX IF NOT EXISTS idx_sale_bogo_discounts_bogo ON sale_bogo_discounts(bogo_offer_id);
CREATE INDEX IF NOT EXISTS idx_sale_bogo_discounts_sale ON sale_bogo_discounts(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_bogo_discounts_tenant ON sale_bogo_discounts(tenant_id);

CREATE INDEX IF NOT EXISTS idx_sale_group_discounts_group ON sale_group_discounts(group_offer_id);
CREATE INDEX IF NOT EXISTS idx_sale_group_discounts_sale ON sale_group_discounts(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_group_discounts_tenant ON sale_group_discounts(tenant_id);

CREATE INDEX IF NOT EXISTS idx_sale_items_bogo ON sale_items(bogo_offer_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_group ON sale_items(group_offer_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_tenant_fk ON sale_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_time_discount ON sale_items(time_discount_id);

CREATE INDEX IF NOT EXISTS idx_sale_time_discounts_sale ON sale_time_discounts(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_time_discounts_tenant ON sale_time_discounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sale_time_discounts_time ON sale_time_discounts(time_discount_id);

CREATE INDEX IF NOT EXISTS idx_sales_cashier ON sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_membership ON sales(membership_id);

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_package ON tenant_subscriptions(package_id);

CREATE INDEX IF NOT EXISTS idx_tenants_approved_by ON tenants(approved_by);

CREATE INDEX IF NOT EXISTS idx_user_profiles_branch ON user_profiles(branch_id);
