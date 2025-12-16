/*
  # Restaurant, Warehouse, and Delivery Management Modules
  
  ## New Tables
  
  ### Restaurant/Table Management Module
  - `restaurant_tables` - Table layout and configuration
  - `table_sessions` - Active table sessions
  - `table_orders` - Orders for specific tables
  
  ### Multi-Warehouse Management Module
  - `warehouses` - Warehouse locations
  - `warehouse_stock` - Stock per warehouse
  - `warehouse_transfers` - Inter-warehouse transfers
  - `warehouse_transfer_items` - Transfer line items
  
  ### Delivery Management Module
  - `delivery_zones` - Delivery areas with fees
  - `deliveries` - Delivery records
  
  ## Security
  - RLS enabled on all tables
  - Multi-tenant isolation enforced
*/

-- =====================================================
-- MODULE 11: Restaurant/Table Management
-- =====================================================

CREATE TABLE IF NOT EXISTS restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  table_number text NOT NULL,
  table_name text,
  capacity integer NOT NULL,
  
  position_x integer DEFAULT 0,
  position_y integer DEFAULT 0,
  
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, table_number)
);

ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tables in their tenant"
  ON restaurant_tables FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can manage tables"
  ON restaurant_tables FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE TABLE IF NOT EXISTS table_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  
  session_start timestamptz DEFAULT now(),
  session_end timestamptz,
  
  status text DEFAULT 'occupied' CHECK (status IN ('occupied', 'ordering', 'served', 'paying', 'closed')),
  
  guest_count integer DEFAULT 1,
  waiter_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  
  sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  
  created_at timestamptz DEFAULT now()
);

ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view table sessions in their tenant"
  ON table_sessions FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage table sessions"
  ON table_sessions FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS table_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  table_session_id uuid NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
  
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity decimal(10,3) NOT NULL,
  unit_price decimal(10,2) NOT NULL,
  
  course text CHECK (course IN ('starter', 'main', 'dessert', 'drink', 'other')),
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'cancelled')),
  
  special_instructions text,
  
  ordered_at timestamptz DEFAULT now(),
  prepared_at timestamptz,
  served_at timestamptz
);

ALTER TABLE table_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view table orders in their tenant"
  ON table_orders FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage table orders"
  ON table_orders FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- =====================================================
-- MODULE 12: Multi-Warehouse Management
-- =====================================================

CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  code text NOT NULL,
  
  address text,
  city text,
  postal_code text,
  country text DEFAULT 'UK',
  
  manager_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  
  is_primary boolean DEFAULT false,
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, code)
);

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view warehouses in their tenant"
  ON warehouses FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can manage warehouses"
  ON warehouses FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE TABLE IF NOT EXISTS warehouse_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  quantity decimal(10,3) DEFAULT 0,
  reserved_quantity decimal(10,3) DEFAULT 0,
  available_quantity decimal(10,3) DEFAULT 0,
  
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, warehouse_id, product_id)
);

ALTER TABLE warehouse_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view warehouse stock in their tenant"
  ON warehouse_stock FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage warehouse stock"
  ON warehouse_stock FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS warehouse_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  transfer_number text NOT NULL,
  transfer_date timestamptz DEFAULT now(),
  
  from_warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  to_warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'received', 'cancelled')),
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(tenant_id, transfer_number)
);

ALTER TABLE warehouse_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view warehouse transfers in their tenant"
  ON warehouse_transfers FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage warehouse transfers"
  ON warehouse_transfers FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS warehouse_transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transfer_id uuid NOT NULL REFERENCES warehouse_transfers(id) ON DELETE CASCADE,
  
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity decimal(10,3) NOT NULL,
  received_quantity decimal(10,3) DEFAULT 0,
  
  created_at timestamptz DEFAULT now()
);

ALTER TABLE warehouse_transfer_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view warehouse transfer items in their tenant"
  ON warehouse_transfer_items FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage warehouse transfer items"
  ON warehouse_transfer_items FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- =====================================================
-- MODULE 13: Delivery Management
-- =====================================================

CREATE TABLE IF NOT EXISTS delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  postal_codes text[],
  
  delivery_fee decimal(10,2) DEFAULT 0,
  minimum_order_amount decimal(10,2) DEFAULT 0,
  
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, name)
);

ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view delivery zones in their tenant"
  ON delivery_zones FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can manage delivery zones"
  ON delivery_zones FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  delivery_number text NOT NULL,
  sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  delivery_address text NOT NULL,
  delivery_city text,
  delivery_postal_code text,
  
  driver_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  
  scheduled_date timestamptz,
  delivered_at timestamptz,
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_transit', 'delivered', 'failed', 'cancelled')),
  
  delivery_fee decimal(10,2) DEFAULT 0,
  
  proof_of_delivery_url text,
  recipient_name text,
  recipient_signature text,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, delivery_number)
);

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deliveries in their tenant"
  ON deliveries FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage deliveries"
  ON deliveries FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_table_sessions_table_status ON table_sessions(table_id, status);
CREATE INDEX IF NOT EXISTS idx_table_orders_session_status ON table_orders(table_session_id, status);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_warehouse_product ON warehouse_stock(warehouse_id, product_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_status ON warehouse_transfers(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver_date ON deliveries(driver_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(tenant_id, status);
