/*
  # Add Shop Settings Tables

  1. New Tables
    - `store_settings` - Store information and branding
    - `receipt_settings` - Receipt customization
    - `security_settings` - Security and access control
    - `tax_settings` - Tax configuration

  2. Security
    - Enable RLS on all tables
    - Add policies for tenant isolation
    - Add indexes for performance
*/

-- =====================================================================
-- STORE SETTINGS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  store_name text DEFAULT '',
  tagline text DEFAULT '',
  address text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  website text DEFAULT '',
  logo_url text,
  whatsapp_number text DEFAULT '',
  whatsapp_qr_url text,
  currency_symbol text DEFAULT '£',
  currency_code text DEFAULT 'GBP',
  timezone text DEFAULT 'Europe/London',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant store settings"
  ON store_settings FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can insert store settings"
  ON store_settings FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can update store settings"
  ON store_settings FOR UPDATE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE INDEX IF NOT EXISTS idx_store_settings_tenant_id ON store_settings(tenant_id);

-- =====================================================================
-- RECEIPT SETTINGS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS receipt_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  receipt_printer_id uuid REFERENCES device_settings(id) ON DELETE SET NULL,
  paper_width text DEFAULT '80mm',
  show_logo boolean DEFAULT true,
  show_barcode boolean DEFAULT true,
  show_qr_code boolean DEFAULT false,
  barcode_type text DEFAULT 'CODE128',
  header_text text DEFAULT '',
  footer_text text DEFAULT 'Thank you for your purchase!',
  greeting_message text DEFAULT 'Welcome!',
  thank_you_message text DEFAULT 'Thank you for shopping with us!',
  show_tax_breakdown boolean DEFAULT true,
  show_item_details boolean DEFAULT true,
  show_cashier_name boolean DEFAULT true,
  show_payment_method boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE receipt_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant receipt settings"
  ON receipt_settings FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can insert receipt settings"
  ON receipt_settings FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can update receipt settings"
  ON receipt_settings FOR UPDATE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE INDEX IF NOT EXISTS idx_receipt_settings_tenant_id ON receipt_settings(tenant_id);

-- =====================================================================
-- SECURITY SETTINGS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  require_pin_for_refunds boolean DEFAULT true,
  require_manager_approval boolean DEFAULT false,
  manager_approval_threshold numeric(10,2) DEFAULT 100.00,
  enable_2fa boolean DEFAULT false,
  session_timeout_minutes integer DEFAULT 60,
  lock_screen_after_minutes integer DEFAULT 15,
  require_biometric boolean DEFAULT false,
  log_all_actions boolean DEFAULT true,
  password_min_length integer DEFAULT 8,
  password_require_special boolean DEFAULT false,
  password_expiry_days integer DEFAULT 90,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant security settings"
  ON security_settings FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can insert security settings"
  ON security_settings FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can update security settings"
  ON security_settings FOR UPDATE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE INDEX IF NOT EXISTS idx_security_settings_tenant_id ON security_settings(tenant_id);

-- =====================================================================
-- TAX SETTINGS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS tax_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tax_name text DEFAULT 'VAT',
  tax_rate numeric(5,2) DEFAULT 20.00,
  tax_enabled boolean DEFAULT true,
  tax_inclusive boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant tax settings"
  ON tax_settings FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can insert tax settings"
  ON tax_settings FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "Users can update tax settings"
  ON tax_settings FOR UPDATE
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE INDEX IF NOT EXISTS idx_tax_settings_tenant_id ON tax_settings(tenant_id);

-- =====================================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================================
CREATE OR REPLACE FUNCTION update_store_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_store_settings_updated_at
  BEFORE UPDATE ON store_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_store_settings_updated_at();

CREATE TRIGGER trigger_update_receipt_settings_updated_at
  BEFORE UPDATE ON receipt_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_store_settings_updated_at();

CREATE TRIGGER trigger_update_security_settings_updated_at
  BEFORE UPDATE ON security_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_store_settings_updated_at();

CREATE TRIGGER trigger_update_tax_settings_updated_at
  BEFORE UPDATE ON tax_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_store_settings_updated_at();