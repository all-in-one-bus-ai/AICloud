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
