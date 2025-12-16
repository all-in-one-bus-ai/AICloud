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