import { supabase } from '../supabase/client';

export interface InventoryForecast {
  id: string;
  tenant_id: string;
  product_id: string;
  forecast_date: string;
  predicted_demand: number;
  predicted_stockout_date?: string;
  confidence_score: number;
  trend_direction?: 'increasing' | 'decreasing' | 'stable';
  seasonal_factor: number;
  historical_accuracy?: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ReorderRecommendation {
  id: string;
  tenant_id: string;
  product_id: string;
  recommended_quantity: number;
  recommended_order_date: string;
  expected_delivery_date?: string;
  estimated_cost?: number;
  confidence_score: number;
  reasoning?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'accepted' | 'rejected' | 'ordered';
  accepted_by?: string;
  accepted_at?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ForecastAlert {
  id: string;
  tenant_id: string;
  product_id?: string;
  alert_type: 'stockout_warning' | 'overstock_warning' | 'reorder_suggestion' | 'trend_change' | 'accuracy_issue';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  action_required: boolean;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ForecastStats {
  total_products_analyzed: number;
  products_at_risk: number;
  pending_recommendations: number;
  active_alerts: number;
  average_confidence: number;
}

export class ForecastingService {
  static async getForecasts(tenantId: string, productId?: string) {
    // @ts-ignore - Table not in generated types yet
    let query = supabase
      .from('inventory_forecasts')
      .select('*, products(name, sku, current_stock)')
      .eq('tenant_id', tenantId)
      .order('forecast_date', { ascending: false });

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  static async getForecastsByDateRange(
    tenantId: string,
    startDate: string,
    endDate: string
  ) {
    // @ts-ignore - Table not in generated types yet
    const { data, error } = await supabase
      .from('inventory_forecasts')
      .select('*, products(name, sku)')
      .eq('tenant_id', tenantId)
      .gte('forecast_date', startDate)
      .lte('forecast_date', endDate)
      .order('forecast_date', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async getStockoutWarnings(tenantId: string) {
    // @ts-ignore - Table not in generated types yet
    const { data, error } = await supabase
      .from('inventory_forecasts')
      .select('*, products(name, sku, current_stock)')
      .eq('tenant_id', tenantId)
      .not('predicted_stockout_date', 'is', null)
      .lte('predicted_stockout_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('predicted_stockout_date', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async getRecommendations(tenantId: string, status?: string) {
    // @ts-ignore - Table not in generated types yet
    let query = supabase
      .from('reorder_recommendations')
      .select('*, products(name, sku, supplier_id, cost_price)')
      .eq('tenant_id', tenantId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  static async updateRecommendationStatus(
    recommendationId: string,
    status: 'accepted' | 'rejected' | 'ordered',
    userId: string
  ) {
    // @ts-ignore - Table not in generated types yet
    const client: any = supabase;
    const { data, error } = await client
      .from('reorder_recommendations')
      .update({
        status,
        accepted_by: userId,
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', recommendationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getAlerts(tenantId: string, acknowledged: boolean = false) {
    // @ts-ignore - Table not in generated types yet
    const { data, error } = await supabase
      .from('forecast_alerts')
      .select('*, products(name, sku)')
      .eq('tenant_id', tenantId)
      .eq('acknowledged', acknowledged)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async acknowledgeAlert(alertId: string, userId: string) {
    // @ts-ignore - Table not in generated types yet
    const client: any = supabase;
    const { data, error } = await client
      .from('forecast_alerts')
      .update({
        acknowledged: true,
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async acknowledgeMultipleAlerts(alertIds: string[], userId: string) {
    // @ts-ignore - Table not in generated types yet
    const client: any = supabase;
    const { data, error } = await client
      .from('forecast_alerts')
      .update({
        acknowledged: true,
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString(),
      })
      .in('id', alertIds)
      .select();

    if (error) throw error;
    return data;
  }

  static async getForecastStats(tenantId: string): Promise<ForecastStats> {
    // @ts-ignore - Table not in generated types yet
    const client: any = supabase;
    const [forecasts, recommendations, alerts] = await Promise.all([
      client
        .from('inventory_forecasts')
        .select('product_id, confidence_score, predicted_stockout_date')
        .eq('tenant_id', tenantId),
      client
        .from('reorder_recommendations')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('status', 'pending'),
      client
        .from('forecast_alerts')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('acknowledged', false),
    ]);

    const uniqueProducts = new Set(forecasts.data?.map((f: any) => f.product_id) || []);
    const productsAtRisk = forecasts.data?.filter(
      (f: any) => f.predicted_stockout_date && new Date(f.predicted_stockout_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    ).length || 0;

    const avgConfidence = forecasts.data?.length
      ? forecasts.data.reduce((sum: number, f: any) => sum + (f.confidence_score || 0), 0) / forecasts.data.length
      : 0;

    return {
      total_products_analyzed: uniqueProducts.size,
      products_at_risk: productsAtRisk,
      pending_recommendations: recommendations.data?.length || 0,
      active_alerts: alerts.data?.length || 0,
      average_confidence: Math.round(avgConfidence * 100) / 100,
    };
  }

  static async triggerForecastGeneration(tenantId: string) {
    const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-forecasts`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tenant_id: tenantId }),
    });

    if (!response.ok) {
      throw new Error('Failed to trigger forecast generation');
    }

    return await response.json();
  }
}
