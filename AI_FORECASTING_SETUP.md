# AI Inventory Forecasting Setup

## Database Migration Required

Please run the following SQL migration in your Supabase SQL Editor to set up the AI forecasting tables:

```sql
/*
  # AI Inventory Forecasting System

  1. New Tables
    - inventory_forecasts: AI-generated predictions for products with demand trends
    - reorder_recommendations: AI-suggested reorder quantities with confidence scores
    - forecast_alerts: Alert system for predicted stockouts and inventory issues

  2. Security
    - Enable RLS on all tables
    - Tenant members can view all data
    - Only managers and owners can create/update forecasts and recommendations

  3. Indexes for Performance
    - Indexes on tenant_id, product_id, forecast_date
    - Indexes on alert status and priority
*/

-- Inventory Forecasts Table
CREATE TABLE IF NOT EXISTS inventory_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  forecast_date date NOT NULL,
  predicted_demand decimal(10,2) NOT NULL DEFAULT 0,
  predicted_stockout_date date,
  confidence_score decimal(3,2) DEFAULT 0.75,
  trend_direction text CHECK (trend_direction IN ('increasing', 'decreasing', 'stable')),
  seasonal_factor decimal(5,2) DEFAULT 1.0,
  historical_accuracy decimal(3,2),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Reorder Recommendations Table
CREATE TABLE IF NOT EXISTS reorder_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  recommended_quantity decimal(10,2) NOT NULL,
  recommended_order_date date NOT NULL,
  expected_delivery_date date,
  estimated_cost decimal(10,2),
  confidence_score decimal(3,2) DEFAULT 0.75,
  reasoning text,
  priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  status text CHECK (status IN ('pending', 'accepted', 'rejected', 'ordered')) DEFAULT 'pending',
  accepted_by uuid REFERENCES auth.users(id),
  accepted_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Forecast Alerts Table
CREATE TABLE IF NOT EXISTS forecast_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  alert_type text CHECK (alert_type IN ('stockout_warning', 'overstock_warning', 'reorder_suggestion', 'trend_change', 'accuracy_issue')) NOT NULL,
  priority text CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  title text NOT NULL,
  message text NOT NULL,
  action_required boolean DEFAULT false,
  acknowledged boolean DEFAULT false,
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_forecasts_tenant_product ON inventory_forecasts(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_forecasts_date ON inventory_forecasts(forecast_date);
CREATE INDEX IF NOT EXISTS idx_inventory_forecasts_stockout ON inventory_forecasts(predicted_stockout_date) WHERE predicted_stockout_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reorder_recommendations_tenant ON reorder_recommendations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reorder_recommendations_status ON reorder_recommendations(status, priority);
CREATE INDEX IF NOT EXISTS idx_reorder_recommendations_product ON reorder_recommendations(product_id);

CREATE INDEX IF NOT EXISTS idx_forecast_alerts_tenant ON forecast_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_forecast_alerts_unacknowledged ON forecast_alerts(acknowledged) WHERE acknowledged = false;
CREATE INDEX IF NOT EXISTS idx_forecast_alerts_priority ON forecast_alerts(priority, created_at);

-- Enable Row Level Security
ALTER TABLE inventory_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reorder_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_forecasts
CREATE POLICY "Tenant members can view forecasts"
  ON inventory_forecasts FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "System can insert forecasts"
  ON inventory_forecasts FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "Managers can update forecasts"
  ON inventory_forecasts FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND role IN ('owner', 'manager')))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND role IN ('owner', 'manager')));

-- RLS Policies for reorder_recommendations
CREATE POLICY "Tenant members can view recommendations"
  ON reorder_recommendations FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "System can insert recommendations"
  ON reorder_recommendations FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "Managers can update recommendations"
  ON reorder_recommendations FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND role IN ('owner', 'manager')))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND role IN ('owner', 'manager')));

-- RLS Policies for forecast_alerts
CREATE POLICY "Tenant members can view alerts"
  ON forecast_alerts FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "System can insert alerts"
  ON forecast_alerts FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can acknowledge alerts"
  ON forecast_alerts FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
```

## Features

This AI forecasting system includes:

1. **Inventory Forecasts** - Time-series predictions of product demand with confidence scores
2. **Reorder Recommendations** - Smart suggestions for when and how much to reorder
3. **Forecast Alerts** - Proactive notifications for stockouts, overstock, and trend changes
4. **Trend Analysis** - Detects increasing, decreasing, or stable demand patterns
5. **Seasonal Factors** - Accounts for seasonal variations in demand

## Next Steps

After running the migration:
1. The AI forecasting service will analyze sales history
2. Generate predictions and recommendations
3. Create alerts for items needing attention
4. Display insights on the Inventory Forecasting dashboard
