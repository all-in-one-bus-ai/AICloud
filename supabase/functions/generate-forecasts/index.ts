import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SaleItem {
  product_id: string;
  quantity: number;
  created_at: string;
}

interface ProductSalesData {
  product_id: string;
  daily_sales: Map<string, number>;
  average_daily_sales: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  current_stock: number;
  lead_time_days: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { tenant_id } = await req.json();

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: 'tenant_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('id, created_at')
      .eq('tenant_id', tenant_id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (salesError) throw salesError;

    const saleIds = sales?.map(s => s.id) || [];

    if (saleIds.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No sales data available for forecasting',
          forecasts_generated: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: saleItems, error: itemsError } = await supabase
      .from('sale_items')
      .select('product_id, quantity, sales(created_at)')
      .in('sale_id', saleIds);

    if (itemsError) throw itemsError;

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, current_stock, reorder_level, cost_price')
      .eq('tenant_id', tenant_id);

    if (productsError) throw productsError;

    const productMap = new Map(products?.map(p => [p.id, p]) || []);
    const productSalesMap = new Map<string, number[]>();

    for (const item of saleItems || []) {
      const dateKey = new Date(item.sales.created_at).toISOString().split('T')[0];
      const key = `${item.product_id}-${dateKey}`;

      if (!productSalesMap.has(key)) {
        productSalesMap.set(key, []);
      }
      productSalesMap.get(key)!.push(item.quantity);
    }

    const dailyAggregated = new Map<string, Map<string, number>>();

    for (const [key, quantities] of productSalesMap.entries()) {
      const [productId, date] = key.split('-');
      const totalQty = quantities.reduce((sum, q) => sum + q, 0);

      if (!dailyAggregated.has(productId)) {
        dailyAggregated.set(productId, new Map());
      }
      dailyAggregated.get(productId)!.set(date, totalQty);
    }

    const forecasts = [];
    const recommendations = [];
    const alerts = [];
    const today = new Date().toISOString().split('T')[0];

    for (const [productId, dailySales] of dailyAggregated.entries()) {
      const product = productMap.get(productId);
      if (!product) continue;

      const salesArray = Array.from(dailySales.values());
      const avgDailySales = salesArray.reduce((sum, val) => sum + val, 0) / 30;

      const recentSales = salesArray.slice(-7);
      const olderSales = salesArray.slice(0, 7);
      const recentAvg = recentSales.length > 0
        ? recentSales.reduce((sum, val) => sum + val, 0) / recentSales.length
        : 0;
      const olderAvg = olderSales.length > 0
        ? olderSales.reduce((sum, val) => sum + val, 0) / olderSales.length
        : 0;

      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (recentAvg > olderAvg * 1.2) trend = 'increasing';
      else if (recentAvg < olderAvg * 0.8) trend = 'decreasing';

      const trendMultiplier = trend === 'increasing' ? 1.2 : trend === 'decreasing' ? 0.8 : 1.0;
      const predictedDemand = avgDailySales * trendMultiplier;

      const daysUntilStockout = predictedDemand > 0
        ? Math.floor(product.current_stock / predictedDemand)
        : null;

      const stockoutDate = daysUntilStockout !== null
        ? new Date(Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : null;

      const variance = salesArray.reduce((sum, val) => {
        return sum + Math.pow(val - avgDailySales, 2);
      }, 0) / salesArray.length;
      const stdDev = Math.sqrt(variance);
      const confidenceScore = Math.max(0.5, Math.min(0.95, 1 - (stdDev / (avgDailySales + 1))));

      forecasts.push({
        tenant_id,
        product_id: productId,
        forecast_date: today,
        predicted_demand: Math.round(predictedDemand * 100) / 100,
        predicted_stockout_date: stockoutDate,
        confidence_score: Math.round(confidenceScore * 100) / 100,
        trend_direction: trend,
        seasonal_factor: 1.0,
        metadata: {
          avg_daily_sales: Math.round(avgDailySales * 100) / 100,
          recent_avg: Math.round(recentAvg * 100) / 100,
          days_until_stockout: daysUntilStockout,
        },
      });

      if (daysUntilStockout !== null && daysUntilStockout < 14) {
        const leadTime = 7;
        const safetyStock = avgDailySales * 3;
        const recommendedQty = Math.ceil((avgDailySales * trendMultiplier * (leadTime + 7)) + safetyStock);
        const priority = daysUntilStockout < 7 ? 'urgent' : daysUntilStockout < 10 ? 'high' : 'medium';

        recommendations.push({
          tenant_id,
          product_id: productId,
          recommended_quantity: recommendedQty,
          recommended_order_date: today,
          expected_delivery_date: new Date(Date.now() + leadTime * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          estimated_cost: Math.round(recommendedQty * (product.cost_price || 0) * 100) / 100,
          confidence_score: Math.round(confidenceScore * 100) / 100,
          reasoning: `Based on average daily sales of ${avgDailySales.toFixed(1)} units and ${trend} trend. Current stock will last approximately ${daysUntilStockout} days.`,
          priority,
          status: 'pending',
        });

        alerts.push({
          tenant_id,
          product_id: productId,
          alert_type: 'stockout_warning',
          priority: priority === 'urgent' ? 'critical' : priority,
          title: `Low Stock Alert: ${product.name}`,
          message: `${product.name} is predicted to run out in ${daysUntilStockout} days. Current stock: ${product.current_stock} units.`,
          action_required: true,
          metadata: {
            days_until_stockout: daysUntilStockout,
            current_stock: product.current_stock,
            avg_daily_sales: avgDailySales,
          },
        });
      }
    }

    if (forecasts.length > 0) {
      const { error: forecastError } = await supabase
        .from('inventory_forecasts')
        .insert(forecasts);

      if (forecastError) throw forecastError;
    }

    if (recommendations.length > 0) {
      const { error: recError } = await supabase
        .from('reorder_recommendations')
        .insert(recommendations);

      if (recError) throw recError;
    }

    if (alerts.length > 0) {
      const { error: alertError } = await supabase
        .from('forecast_alerts')
        .insert(alerts);

      if (alertError) throw alertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        forecasts_generated: forecasts.length,
        recommendations_created: recommendations.length,
        alerts_created: alerts.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating forecasts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
