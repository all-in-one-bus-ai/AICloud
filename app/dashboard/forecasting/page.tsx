'use client';

import { useEffect, useState } from 'react';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { ForecastingService, ForecastAlert, ReorderRecommendation, ForecastStats } from '@/lib/ai/forecastingService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Package, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ForecastingPage() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState<ForecastStats | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [stockoutWarnings, setStockoutWarnings] = useState<any[]>([]);

  useEffect(() => {
    if (tenantId) {
      loadData();
    }
  }, [tenantId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, alertsData, recsData, warningsData] = await Promise.all([
        ForecastingService.getForecastStats(tenantId!),
        ForecastingService.getAlerts(tenantId!, false),
        ForecastingService.getRecommendations(tenantId!, 'pending'),
        ForecastingService.getStockoutWarnings(tenantId!),
      ]);

      setStats(statsData);
      setAlerts(alertsData || []);
      setRecommendations(recsData || []);
      setStockoutWarnings(warningsData || []);
    } catch (error) {
      console.error('Error loading forecast data:', error);
      toast.error('Failed to load forecast data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateForecasts = async () => {
    try {
      setGenerating(true);
      await ForecastingService.triggerForecastGeneration(tenantId!);
      toast.success('Forecasts generated successfully');
      await loadData();
    } catch (error) {
      console.error('Error generating forecasts:', error);
      toast.error('Failed to generate forecasts');
    } finally {
      setGenerating(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await ForecastingService.acknowledgeAlert(alertId, user!.id);
      toast.success('Alert acknowledged');
      await loadData();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Failed to acknowledge alert');
    }
  };

  const handleUpdateRecommendation = async (recommendationId: string, status: 'accepted' | 'rejected') => {
    try {
      await ForecastingService.updateRecommendationStatus(recommendationId, status, user!.id);
      toast.success(`Recommendation ${status}`);
      await loadData();
    } catch (error) {
      console.error('Error updating recommendation:', error);
      toast.error('Failed to update recommendation');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!tenantId) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Tenant Selected</AlertTitle>
          <AlertDescription>Please select a tenant to view forecasting data.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Inventory Forecasting</h1>
          <p className="text-gray-500 mt-1">Predictive analytics for smart inventory management</p>
        </div>
        <Button onClick={handleGenerateForecasts} disabled={generating}>
          <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
          {generating ? 'Generating...' : 'Generate Forecasts'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Products Analyzed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_products_analyzed || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">At Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.products_at_risk || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.pending_recommendations || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.active_alerts || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Avg Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{((stats?.average_confidence || 0) * 100).toFixed(0)}%</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts" className="w-full">
        <TabsList>
          <TabsTrigger value="alerts">
            Alerts ({alerts.length})
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            Recommendations ({recommendations.length})
          </TabsTrigger>
          <TabsTrigger value="warnings">
            Stockout Warnings ({stockoutWarnings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No active alerts
              </CardContent>
            </Card>
          ) : (
            alerts.map((alert) => (
              <Card key={alert.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getPriorityColor(alert.priority)}>
                          {alert.priority}
                        </Badge>
                        <Badge variant="outline">{alert.alert_type.replace(/_/g, ' ')}</Badge>
                      </div>
                      <CardTitle className="text-lg">{alert.title}</CardTitle>
                      <CardDescription className="mt-2">{alert.message}</CardDescription>
                      {alert.products && (
                        <p className="text-sm text-gray-500 mt-2">
                          Product: {alert.products.name} ({alert.products.sku})
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Acknowledge
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          {recommendations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No pending recommendations
              </CardContent>
            </Card>
          ) : (
            recommendations.map((rec) => (
              <Card key={rec.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getPriorityColor(rec.priority)}>
                          {rec.priority}
                        </Badge>
                        <Badge variant="outline">
                          Confidence: {(rec.confidence_score * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">
                        {rec.products?.name} ({rec.products?.sku})
                      </CardTitle>
                      <CardDescription className="mt-2">
                        <div className="space-y-1">
                          <p><strong>Recommended Quantity:</strong> {rec.recommended_quantity} units</p>
                          <p><strong>Order Date:</strong> {new Date(rec.recommended_order_date).toLocaleDateString()}</p>
                          {rec.expected_delivery_date && (
                            <p><strong>Expected Delivery:</strong> {new Date(rec.expected_delivery_date).toLocaleDateString()}</p>
                          )}
                          {rec.estimated_cost && (
                            <p><strong>Estimated Cost:</strong> ${rec.estimated_cost.toFixed(2)}</p>
                          )}
                          {rec.reasoning && (
                            <p className="mt-2 text-gray-600">{rec.reasoning}</p>
                          )}
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleUpdateRecommendation(rec.id, 'accepted')}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateRecommendation(rec.id, 'rejected')}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="warnings" className="space-y-4">
          {stockoutWarnings.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No stockout warnings
              </CardContent>
            </Card>
          ) : (
            stockoutWarnings.map((warning) => (
              <Card key={warning.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getTrendIcon(warning.trend_direction)}
                        <Badge variant="outline">
                          {(warning.confidence_score * 100).toFixed(0)}% confidence
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">
                        {warning.products?.name} ({warning.products?.sku})
                      </CardTitle>
                      <CardDescription className="mt-2">
                        <div className="space-y-1">
                          <p><strong>Current Stock:</strong> {warning.products?.current_stock} units</p>
                          <p><strong>Predicted Demand:</strong> {warning.predicted_demand} units/day</p>
                          {warning.predicted_stockout_date && (
                            <p className="text-red-600 font-semibold">
                              <strong>Predicted Stockout:</strong> {new Date(warning.predicted_stockout_date).toLocaleDateString()}
                            </p>
                          )}
                          <p><strong>Trend:</strong> {warning.trend_direction}</p>
                          {warning.metadata?.days_until_stockout !== undefined && (
                            <p className="text-orange-600">
                              Approximately {warning.metadata.days_until_stockout} days until stockout
                            </p>
                          )}
                        </div>
                      </CardDescription>
                    </div>
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
