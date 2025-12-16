/*
  # Bookings, Manufacturing, and Asset Management Modules
  
  ## New Tables
  
  ### Booking & Appointments Module
  - `services` - Service offerings for booking
  - `appointments` - Customer appointments/bookings
  
  ### Manufacturing & Assembly Module
  - `bill_of_materials` - BOM for manufactured products
  - `bom_components` - Components required for BOM
  - `production_orders` - Production work orders
  
  ### Asset Management Module
  - `asset_categories` - Asset classification
  - `assets` - Business asset registry
  - `asset_maintenance` - Maintenance history
  
  ## Security
  - RLS enabled on all tables
  - Multi-tenant isolation enforced
*/

-- =====================================================
-- MODULE 14: Booking & Appointments
-- =====================================================

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  description text,
  
  duration_minutes integer NOT NULL,
  price decimal(10,2) NOT NULL,
  
  requires_deposit boolean DEFAULT false,
  deposit_amount decimal(10,2) DEFAULT 0,
  
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active services"
  ON services FOR SELECT
  TO authenticated
  USING (is_active = true AND tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can manage services"
  ON services FOR ALL
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

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  appointment_number text NOT NULL,
  appointment_date timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  
  deposit_paid boolean DEFAULT false,
  deposit_amount decimal(10,2) DEFAULT 0,
  
  notes text,
  
  reminder_sent boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(tenant_id, appointment_number)
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view appointments in their tenant"
  ON appointments FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage appointments"
  ON appointments FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- =====================================================
-- MODULE 15: Manufacturing & Assembly
-- =====================================================

CREATE TABLE IF NOT EXISTS bill_of_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  finished_product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL,
  version text DEFAULT '1.0',
  
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, finished_product_id, version)
);

ALTER TABLE bill_of_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view BOMs in their tenant"
  ON bill_of_materials FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can manage BOMs"
  ON bill_of_materials FOR ALL
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

CREATE TABLE IF NOT EXISTS bom_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bom_id uuid NOT NULL REFERENCES bill_of_materials(id) ON DELETE CASCADE,
  
  component_product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity decimal(10,3) NOT NULL,
  
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bom_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view BOM components in their tenant"
  ON bom_components FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can manage BOM components"
  ON bom_components FOR ALL
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

CREATE TABLE IF NOT EXISTS production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  order_number text NOT NULL,
  bom_id uuid NOT NULL REFERENCES bill_of_materials(id) ON DELETE RESTRICT,
  
  quantity_to_produce decimal(10,3) NOT NULL,
  quantity_produced decimal(10,3) DEFAULT 0,
  
  start_date timestamptz,
  target_completion_date timestamptz,
  actual_completion_date timestamptz,
  
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(tenant_id, order_number)
);

ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view production orders in their tenant"
  ON production_orders FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can manage production orders"
  ON production_orders FOR ALL
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

-- =====================================================
-- MODULE 16: Asset Management
-- =====================================================

CREATE TABLE IF NOT EXISTS asset_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  depreciation_rate decimal(5,2) DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, name)
);

ALTER TABLE asset_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view asset categories in their tenant"
  ON asset_categories FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can manage asset categories"
  ON asset_categories FOR ALL
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

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  asset_number text NOT NULL,
  name text NOT NULL,
  description text,
  
  category_id uuid REFERENCES asset_categories(id) ON DELETE SET NULL,
  
  purchase_date date,
  purchase_cost decimal(10,2),
  current_value decimal(10,2),
  
  assigned_to_staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  location text,
  
  serial_number text,
  warranty_expiry_date date,
  
  insurance_policy_number text,
  insurance_expiry_date date,
  
  status text DEFAULT 'active' CHECK (status IN ('active', 'in_maintenance', 'retired', 'disposed')),
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, asset_number)
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assets in their tenant"
  ON assets FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can manage assets"
  ON assets FOR ALL
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

CREATE TABLE IF NOT EXISTS asset_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  
  maintenance_date timestamptz DEFAULT now(),
  maintenance_type text CHECK (maintenance_type IN ('routine', 'repair', 'inspection', 'calibration')),
  
  description text,
  cost decimal(10,2),
  
  performed_by text,
  next_maintenance_date date,
  
  created_at timestamptz DEFAULT now()
);

ALTER TABLE asset_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view asset maintenance in their tenant"
  ON asset_maintenance FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can manage asset maintenance"
  ON asset_maintenance FOR ALL
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

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(tenant_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_staff ON appointments(staff_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_assets_tenant_status ON assets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_asset_maintenance_asset ON asset_maintenance(asset_id, maintenance_date DESC);
