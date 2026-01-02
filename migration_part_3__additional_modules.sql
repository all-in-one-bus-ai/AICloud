-- Part 3 - Additional Modules
-- Run this in Supabase SQL Editor


-- ============ 20251212011457_add_device_settings.sql ============

/*
  # Add Device Settings for POS Hardware

  1. New Tables
    - `device_settings`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key to tenants)
      - `device_type` (text) - receipt_printer, label_printer, scanner, cash_drawer, weight_scale
      - `device_name` (text) - user-friendly name
      - `is_enabled` (boolean) - whether device is active
      - `connection_type` (text) - USB, USB-HID, Serial, Network
      - `configuration` (jsonb) - device-specific settings
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `device_settings` table
    - Add policies for tenant users to manage their device settings

  3. Indexes
    - Index on tenant_id for faster queries
    - Index on device_type for filtering
*/

CREATE TABLE IF NOT EXISTS device_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_type text NOT NULL CHECK (device_type IN ('receipt_printer', 'label_printer', 'barcode_scanner', 'cash_drawer', 'weight_scale')),
  device_name text NOT NULL,
  is_enabled boolean DEFAULT true,
  connection_type text NOT NULL,
  configuration jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE device_settings ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_device_settings_tenant_id ON device_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_device_settings_device_type ON device_settings(device_type);

-- Policies for authenticated users to manage devices in their tenant
CREATE POLICY "Users can view devices in their tenant"
  ON device_settings FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert devices in their tenant"
  ON device_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update devices in their tenant"
  ON device_settings FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete devices in their tenant"
  ON device_settings FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_device_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_device_settings_updated_at
  BEFORE UPDATE ON device_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_device_settings_updated_at();

-- ============ 20251216050959_add_all_30_modules_comprehensive_schema_v2.sql ============

/*
  # Comprehensive Schema for All 30 Modules (Corrected)
  
  ## Overview
  This migration adds complete database schema for all 30 business modules including:
  - Feature toggles and tenant settings
  - Suppliers & Purchases
  - Expense Tracking
  - Staff Management & Attendance
  - Activity Logs & Audit Trail
  - UK Payroll & HMRC Payslip PDF
  - Returns & Refunds Management
  - Gift Cards & Vouchers
  - Advanced Reports
  - Invoices & Credit Sales
  - Automated Reordering
  - Restaurant/Table Management
  - E-commerce Integration
  - API Access & Webhooks
  - Multi-Warehouse Management
  - Booking & Appointments
  - Manufacturing & Assembly
  - Delivery Management
  - Asset Management
  - Document Management
  - CRM
  - Task & Project Management
  - Email Marketing
  - Self-Checkout
  
  ## Security
  - All tables have RLS enabled
  - Policies restrict access to tenant data only
  - Audit logging on critical operations
  - Role-based access control (owner, manager, cashier)
*/

-- =====================================================
-- MODULE 1: Feature Toggles & Tenant Settings
-- =====================================================

CREATE TABLE IF NOT EXISTS tenant_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Core Features
  feature_suppliers boolean DEFAULT true,
  feature_expenses boolean DEFAULT true,
  feature_staff boolean DEFAULT true,
  feature_attendance boolean DEFAULT true,
  feature_audit_logs boolean DEFAULT true,
  feature_payroll boolean DEFAULT false,
  
  -- Sales Features
  feature_returns boolean DEFAULT true,
  feature_gift_cards boolean DEFAULT true,
  feature_invoices boolean DEFAULT true,
  feature_credit_sales boolean DEFAULT true,
  
  -- Advanced Features
  feature_advanced_reports boolean DEFAULT false,
  feature_auto_reordering boolean DEFAULT false,
  feature_restaurant_mode boolean DEFAULT false,
  feature_ecommerce boolean DEFAULT false,
  feature_api_access boolean DEFAULT false,
  
  -- Inventory Features
  feature_warehouses boolean DEFAULT false,
  feature_manufacturing boolean DEFAULT false,
  
  -- Service Features
  feature_bookings boolean DEFAULT false,
  feature_delivery boolean DEFAULT false,
  
  -- Management Features
  feature_assets boolean DEFAULT false,
  feature_documents boolean DEFAULT false,
  feature_crm boolean DEFAULT false,
  feature_tasks boolean DEFAULT false,
  
  -- Marketing Features
  feature_email_marketing boolean DEFAULT false,
  feature_self_checkout boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id)
);

ALTER TABLE tenant_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant feature flags"
  ON tenant_feature_flags FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Owners can update feature flags"
  ON tenant_feature_flags FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "System can insert feature flags"
  ON tenant_feature_flags FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- MODULE 2: Suppliers & Purchases
-- =====================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  city text,
  postal_code text,
  country text DEFAULT 'UK',
  
  payment_terms text,
  credit_limit decimal(10,2) DEFAULT 0,
  current_balance decimal(10,2) DEFAULT 0,
  
  notes text,
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view suppliers in their tenant"
  ON suppliers FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can insert suppliers"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Managers can update suppliers"
  ON suppliers FOR UPDATE
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

CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  
  po_number text NOT NULL,
  order_date timestamptz DEFAULT now(),
  expected_delivery_date timestamptz,
  actual_delivery_date timestamptz,
  
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'received', 'cancelled')),
  
  subtotal decimal(10,2) DEFAULT 0,
  tax_amount decimal(10,2) DEFAULT 0,
  total_amount decimal(10,2) DEFAULT 0,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(tenant_id, po_number)
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view purchase orders in their tenant"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can manage purchase orders"
  ON purchase_orders FOR ALL
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

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  
  quantity decimal(10,3) NOT NULL,
  unit_cost decimal(10,2) NOT NULL,
  total_cost decimal(10,2) NOT NULL,
  received_quantity decimal(10,3) DEFAULT 0,
  
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view PO items in their tenant"
  ON purchase_order_items FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can manage PO items"
  ON purchase_order_items FOR ALL
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

-- Continue with remaining tables...
-- Due to token limits, I'll create tables in batches

-- =====================================================
-- MODULE 3: Expense Tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, name)
);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view expense categories in their tenant"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can manage expense categories"
  ON expense_categories FOR ALL
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

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES expense_categories(id) ON DELETE SET NULL,
  
  description text NOT NULL,
  amount decimal(10,2) NOT NULL,
  expense_date timestamptz NOT NULL,
  
  payment_method text CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'cheque', 'other')),
  reference_number text,
  
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  receipt_url text,
  
  notes text,
  is_recurring boolean DEFAULT false,
  recurrence_pattern text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view expenses in their tenant"
  ON expenses FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can manage expenses"
  ON expenses FOR ALL
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
-- MODULE 4: Staff Management & Attendance
-- =====================================================

CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  employee_number text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  
  position text,
  department text,
  hourly_rate decimal(10,2),
  salary decimal(10,2),
  employment_type text CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'casual')),
  
  hire_date date,
  termination_date date,
  is_active boolean DEFAULT true,
  
  address text,
  city text,
  postal_code text,
  
  emergency_contact_name text,
  emergency_contact_phone text,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, employee_number)
);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view staff in their tenant"
  ON staff FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can manage staff"
  ON staff FOR ALL
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

CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  
  clock_in timestamptz NOT NULL,
  clock_out timestamptz,
  
  break_start timestamptz,
  break_end timestamptz,
  total_break_minutes integer DEFAULT 0,
  
  total_hours decimal(5,2),
  notes text,
  
  created_at timestamptz DEFAULT now()
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attendance in their tenant"
  ON attendance FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "All staff can clock in/out"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "All staff can update own attendance"
  ON attendance FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- =====================================================
-- MODULE 5: Activity Logs & Audit Trail
-- =====================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  
  old_values jsonb,
  new_values jsonb,
  
  ip_address text,
  user_agent text,
  
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "System can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_created 
  ON activity_logs(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity 
  ON activity_logs(tenant_id, entity_type, entity_id);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Suppliers & Purchases
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_status ON purchase_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);

-- Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_date ON expenses(tenant_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);

-- Staff & Attendance
CREATE INDEX IF NOT EXISTS idx_staff_tenant ON staff(tenant_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_attendance_staff_date ON attendance(staff_id, clock_in DESC);


-- ============ 20251216051054_add_payroll_and_returns_modules.sql ============

/*
  # UK Payroll & Returns Management Modules
  
  ## New Tables
  
  ### UK Payroll Module
  - `payroll_settings_uk` - UK-specific HMRC settings
  - `employee_tax_details` - Employee tax codes, NI numbers, etc.
  - `payroll_runs` - Payroll processing runs
  - `payslips` - Individual employee payslips with HMRC calculations
  
  ### Returns & Refunds Module
  - `return_reasons` - Configurable return reasons
  - `returns` - Return/refund transactions
  - `return_items` - Individual items being returned
  
  ## Security
  - RLS enabled on all tables
  - Managers can manage payroll and returns
  - Staff can view own payslips
*/

-- =====================================================
-- MODULE 6: UK Payroll & HMRC Payslip PDF
-- =====================================================

CREATE TABLE IF NOT EXISTS payroll_settings_uk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  tax_year text NOT NULL,
  company_paye_reference text,
  accounts_office_reference text,
  employer_ni_category text DEFAULT 'A',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, tax_year)
);

ALTER TABLE payroll_settings_uk ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view payroll settings"
  ON payroll_settings_uk FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Owners can manage payroll settings"
  ON payroll_settings_uk FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE TABLE IF NOT EXISTS employee_tax_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  
  ni_number text,
  tax_code text DEFAULT '1257L',
  student_loan_plan text CHECK (student_loan_plan IN ('none', 'plan_1', 'plan_2', 'plan_4', 'plan_5', 'postgraduate')),
  
  pension_scheme boolean DEFAULT false,
  pension_percentage decimal(5,2) DEFAULT 5.00,
  
  is_director boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, staff_id)
);

ALTER TABLE employee_tax_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view employee tax details"
  ON employee_tax_details FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Managers can manage employee tax details"
  ON employee_tax_details FOR ALL
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

CREATE TABLE IF NOT EXISTS payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  pay_period_start date NOT NULL,
  pay_period_end date NOT NULL,
  payment_date date NOT NULL,
  tax_period integer NOT NULL,
  
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid', 'cancelled')),
  
  total_gross_pay decimal(10,2) DEFAULT 0,
  total_tax decimal(10,2) DEFAULT 0,
  total_ni_employee decimal(10,2) DEFAULT 0,
  total_ni_employer decimal(10,2) DEFAULT 0,
  total_pension_employee decimal(10,2) DEFAULT 0,
  total_pension_employer decimal(10,2) DEFAULT 0,
  total_net_pay decimal(10,2) DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view payroll runs"
  ON payroll_runs FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Managers can manage payroll runs"
  ON payroll_runs FOR ALL
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

CREATE TABLE IF NOT EXISTS payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payroll_run_id uuid NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  
  gross_pay decimal(10,2) NOT NULL,
  taxable_pay decimal(10,2) NOT NULL,
  
  income_tax decimal(10,2) DEFAULT 0,
  ni_employee decimal(10,2) DEFAULT 0,
  ni_employer decimal(10,2) DEFAULT 0,
  pension_employee decimal(10,2) DEFAULT 0,
  pension_employer decimal(10,2) DEFAULT 0,
  student_loan_deduction decimal(10,2) DEFAULT 0,
  other_deductions decimal(10,2) DEFAULT 0,
  
  net_pay decimal(10,2) NOT NULL,
  
  ytd_gross decimal(10,2) DEFAULT 0,
  ytd_tax decimal(10,2) DEFAULT 0,
  ytd_ni decimal(10,2) DEFAULT 0,
  ytd_pension decimal(10,2) DEFAULT 0,
  ytd_student_loan decimal(10,2) DEFAULT 0,
  
  pdf_url text,
  
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view all payslips"
  ON payslips FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Staff can view own payslips"
  ON payslips FOR SELECT
  TO authenticated
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage payslips"
  ON payslips FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- =====================================================
-- MODULE 7: Returns & Refunds Management
-- =====================================================

CREATE TABLE IF NOT EXISTS return_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  reason text NOT NULL,
  requires_manager_approval boolean DEFAULT false,
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, reason)
);

ALTER TABLE return_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view return reasons in their tenant"
  ON return_reasons FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can manage return reasons"
  ON return_reasons FOR ALL
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

CREATE TABLE IF NOT EXISTS returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  
  return_number text NOT NULL,
  return_date timestamptz DEFAULT now(),
  
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  reason_id uuid REFERENCES return_reasons(id) ON DELETE SET NULL,
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  refund_method text CHECK (refund_method IN ('cash', 'card', 'store_credit', 'exchange')),
  
  subtotal decimal(10,2) DEFAULT 0,
  tax_amount decimal(10,2) DEFAULT 0,
  total_amount decimal(10,2) DEFAULT 0,
  
  notes text,
  
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(tenant_id, return_number)
);

ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view returns in their tenant"
  ON returns FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create returns"
  ON returns FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update returns"
  ON returns FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  return_id uuid NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity decimal(10,3) NOT NULL,
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  
  condition text CHECK (condition IN ('new', 'opened', 'damaged', 'defective')),
  restock boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now()
);

ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view return items in their tenant"
  ON return_items FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage return items"
  ON return_items FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_payslips_staff ON payslips(staff_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_tenant_date ON payroll_runs(tenant_id, pay_period_start DESC);
CREATE INDEX IF NOT EXISTS idx_returns_tenant_date ON returns(tenant_id, return_date DESC);
CREATE INDEX IF NOT EXISTS idx_returns_sale ON returns(sale_id);


-- ============ 20251216051140_add_gift_cards_invoices_and_reordering_modules.sql ============

/*
  # Gift Cards, Invoices, and Automated Reordering Modules
  
  ## New Tables
  
  ### Gift Cards & Vouchers Module
  - `gift_cards` - Gift card/voucher records
  - `gift_card_transactions` - Transaction history for gift cards
  
  ### Invoices & Credit Sales Module
  - `invoices` - Invoice records
  - `invoice_items` - Line items on invoices
  - `invoice_payments` - Payment history for invoices
  
  ### Automated Reordering Module
  - `reorder_rules` - Reorder point rules for products
  - `reorder_suggestions` - System-generated reorder suggestions
  
  ## Security
  - RLS enabled on all tables
  - Multi-tenant isolation enforced
*/

-- =====================================================
-- MODULE 8: Gift Cards & Vouchers
-- =====================================================

CREATE TABLE IF NOT EXISTS gift_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  card_number text NOT NULL,
  pin_code text,
  
  card_type text DEFAULT 'gift_card' CHECK (card_type IN ('gift_card', 'voucher', 'promotional')),
  
  initial_value decimal(10,2) NOT NULL,
  current_balance decimal(10,2) NOT NULL,
  
  issued_date timestamptz DEFAULT now(),
  expiry_date timestamptz,
  
  is_active boolean DEFAULT true,
  
  issued_to_customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  purchased_by_customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(tenant_id, card_number)
);

ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view gift cards in their tenant"
  ON gift_cards FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage gift cards"
  ON gift_cards FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS gift_card_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  gift_card_id uuid NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
  
  transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'redeem', 'refund', 'adjustment')),
  amount decimal(10,2) NOT NULL,
  balance_after decimal(10,2) NOT NULL,
  
  sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  notes text,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE gift_card_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view gift card transactions in their tenant"
  ON gift_card_transactions FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create gift card transactions"
  ON gift_card_transactions FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- =====================================================
-- MODULE 9: Invoices & Credit Sales
-- =====================================================

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  invoice_number text NOT NULL,
  invoice_date timestamptz DEFAULT now(),
  due_date timestamptz,
  
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  
  subtotal decimal(10,2) DEFAULT 0,
  tax_amount decimal(10,2) DEFAULT 0,
  total_amount decimal(10,2) DEFAULT 0,
  paid_amount decimal(10,2) DEFAULT 0,
  balance_due decimal(10,2) DEFAULT 0,
  
  payment_terms text,
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(tenant_id, invoice_number)
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoices in their tenant"
  ON invoices FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  
  product_id uuid REFERENCES products(id) ON DELETE RESTRICT,
  description text NOT NULL,
  
  quantity decimal(10,3) NOT NULL,
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoice items in their tenant"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage invoice items"
  ON invoice_items FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  
  payment_date timestamptz DEFAULT now(),
  amount decimal(10,2) NOT NULL,
  payment_method text NOT NULL,
  
  reference_number text,
  notes text,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoice payments in their tenant"
  ON invoice_payments FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create invoice payments"
  ON invoice_payments FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- =====================================================
-- MODULE 10: Automated Reordering
-- =====================================================

CREATE TABLE IF NOT EXISTS reorder_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  reorder_point decimal(10,3) NOT NULL,
  reorder_quantity decimal(10,3) NOT NULL,
  
  preferred_supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  lead_time_days integer DEFAULT 7,
  
  auto_generate_po boolean DEFAULT false,
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, product_id)
);

ALTER TABLE reorder_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reorder rules in their tenant"
  ON reorder_rules FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can manage reorder rules"
  ON reorder_rules FOR ALL
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

CREATE TABLE IF NOT EXISTS reorder_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  current_stock decimal(10,3) NOT NULL,
  reorder_point decimal(10,3) NOT NULL,
  suggested_quantity decimal(10,3) NOT NULL,
  
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  estimated_cost decimal(10,2),
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'ordered', 'dismissed')),
  
  generated_po_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
  
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id)
);

ALTER TABLE reorder_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view reorder suggestions"
  ON reorder_suggestions FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "System can create reorder suggestions"
  ON reorder_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can update reorder suggestions"
  ON reorder_suggestions FOR UPDATE
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

CREATE INDEX IF NOT EXISTS idx_gift_cards_number ON gift_cards(card_number) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_card ON gift_card_transactions(gift_card_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(tenant_id, due_date) WHERE status != 'paid';


-- ============ 20251216051227_add_restaurant_warehouse_and_delivery_modules.sql ============

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


-- ============ 20251216051313_add_bookings_manufacturing_and_assets_modules.sql ============

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


-- ============ 20251216051351_add_crm_documents_and_tasks_modules.sql ============

/*
  # CRM, Document Management, and Task Management Modules
  
  ## New Tables
  
  ### CRM Module
  - `leads` - Sales leads/prospects
  - `customer_interactions` - Interaction history with customers/leads
  
  ### Document Management Module
  - `document_categories` - Document classification
  - `documents` - Document repository
  
  ### Task & Project Management Module
  - `tasks` - Task tracking
  - `task_comments` - Comments on tasks
  
  ## Security
  - RLS enabled on all tables
  - Multi-tenant isolation enforced
*/

-- =====================================================
-- MODULE 17: CRM
-- =====================================================

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  company text,
  
  source text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost')),
  
  estimated_value decimal(10,2),
  probability integer DEFAULT 50,
  
  assigned_to uuid REFERENCES staff(id) ON DELETE SET NULL,
  
  notes text,
  
  converted_to_customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  converted_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view leads in their tenant"
  ON leads FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage leads"
  ON leads FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS customer_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  
  interaction_type text NOT NULL CHECK (interaction_type IN ('call', 'email', 'meeting', 'note', 'task')),
  subject text NOT NULL,
  description text,
  
  interaction_date timestamptz DEFAULT now(),
  
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view interactions in their tenant"
  ON customer_interactions FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage interactions"
  ON customer_interactions FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- =====================================================
-- MODULE 18: Document Management
-- =====================================================

CREATE TABLE IF NOT EXISTS document_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  description text,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, name)
);

ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view document categories in their tenant"
  ON document_categories FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can manage document categories"
  ON document_categories FOR ALL
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

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  title text NOT NULL,
  description text,
  
  category_id uuid REFERENCES document_categories(id) ON DELETE SET NULL,
  
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  file_type text,
  
  document_date date,
  expiry_date date,
  
  tags text[],
  
  version text DEFAULT '1.0',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents in their tenant"
  ON documents FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can upload documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can manage documents"
  ON documents FOR ALL
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
-- MODULE 19: Task & Project Management
-- =====================================================

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  title text NOT NULL,
  description text,
  
  status text DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  assigned_to uuid REFERENCES staff(id) ON DELETE SET NULL,
  
  due_date timestamptz,
  completed_at timestamptz,
  
  tags text[],
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks in their tenant"
  ON tasks FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage tasks"
  ON tasks FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  comment text NOT NULL,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task comments in their tenant"
  ON task_comments FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create task comments"
  ON task_comments FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_leads_tenant_status ON leads(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer ON customer_interactions(customer_id, interaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_category ON documents(tenant_id, category_id);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON documents(tenant_id, expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(tenant_id, due_date) WHERE status != 'completed';


-- ============ 20251216051441_add_api_ecommerce_and_email_marketing_modules.sql ============

/*
  # API, E-commerce, and Email Marketing Modules (Final)
  
  ## New Tables
  
  ### API Access & Webhooks Module
  - `api_keys` - API key management
  - `webhooks` - Webhook configurations
  - `webhook_logs` - Webhook execution logs
  
  ### E-commerce Integration Module
  - `ecommerce_connections` - Platform connections
  - `ecommerce_orders` - Imported orders from platforms
  
  ### Email Marketing Module
  - `email_campaigns` - Email campaign management
  - `email_campaign_logs` - Campaign delivery logs
  
  ## Security
  - RLS enabled on all tables
  - Owner-only access for API keys and webhooks
*/

-- =====================================================
-- MODULE 20: API Access & Webhooks
-- =====================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  key_name text NOT NULL,
  api_key text NOT NULL UNIQUE,
  api_secret text NOT NULL,
  
  permissions jsonb DEFAULT '{"read": true, "write": false}'::jsonb,
  
  is_active boolean DEFAULT true,
  
  last_used_at timestamptz,
  usage_count integer DEFAULT 0,
  
  expires_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view API keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can manage API keys"
  ON api_keys FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  url text NOT NULL,
  secret text,
  
  events text[] NOT NULL,
  
  is_active boolean DEFAULT true,
  
  last_triggered_at timestamptz,
  total_triggers integer DEFAULT 0,
  failed_triggers integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view webhooks"
  ON webhooks FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can manage webhooks"
  ON webhooks FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  webhook_id uuid NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  
  event text NOT NULL,
  payload jsonb NOT NULL,
  
  status_code integer,
  response_body text,
  
  success boolean DEFAULT false,
  error_message text,
  
  created_at timestamptz DEFAULT now()
);

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view webhook logs"
  ON webhook_logs FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "System can insert webhook logs"
  ON webhook_logs FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- =====================================================
-- MODULE 21: E-commerce Integration
-- =====================================================

CREATE TABLE IF NOT EXISTS ecommerce_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  platform text NOT NULL CHECK (platform IN ('shopify', 'woocommerce', 'ebay', 'amazon', 'custom')),
  store_name text NOT NULL,
  
  api_key text,
  api_secret text,
  store_url text,
  
  is_active boolean DEFAULT true,
  last_sync_at timestamptz,
  
  sync_inventory boolean DEFAULT true,
  sync_orders boolean DEFAULT true,
  sync_customers boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ecommerce_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view ecommerce connections"
  ON ecommerce_connections FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can manage ecommerce connections"
  ON ecommerce_connections FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE TABLE IF NOT EXISTS ecommerce_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES ecommerce_connections(id) ON DELETE CASCADE,
  
  external_order_id text NOT NULL,
  external_order_number text,
  
  order_date timestamptz NOT NULL,
  
  customer_name text,
  customer_email text,
  
  total_amount decimal(10,2) NOT NULL,
  
  status text DEFAULT 'pending',
  
  imported_to_sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  imported_at timestamptz,
  
  raw_data jsonb,
  
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ecommerce_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ecommerce orders in their tenant"
  ON ecommerce_orders FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "System can insert ecommerce orders"
  ON ecommerce_orders FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- =====================================================
-- MODULE 22: Email Marketing
-- =====================================================

CREATE TABLE IF NOT EXISTS email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  subject text NOT NULL,
  html_content text NOT NULL,
  
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  
  scheduled_at timestamptz,
  sent_at timestamptz,
  
  recipient_filter jsonb,
  
  total_recipients integer DEFAULT 0,
  emails_sent integer DEFAULT 0,
  emails_opened integer DEFAULT 0,
  emails_clicked integer DEFAULT 0,
  emails_bounced integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view email campaigns"
  ON email_campaigns FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Managers can manage email campaigns"
  ON email_campaigns FOR ALL
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

CREATE TABLE IF NOT EXISTS email_campaign_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  email_address text NOT NULL,
  
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained')),
  
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  clicked_at timestamptz
);

ALTER TABLE email_campaign_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view email campaign logs"
  ON email_campaign_logs FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "System can insert email campaign logs"
  ON email_campaign_logs FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(api_key) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON webhook_logs(webhook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_connection ON ecommerce_orders(connection_id, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(tenant_id, status);
