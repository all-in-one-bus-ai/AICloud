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
