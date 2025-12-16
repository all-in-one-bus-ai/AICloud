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
