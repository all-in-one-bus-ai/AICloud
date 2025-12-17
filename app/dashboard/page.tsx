'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, ShoppingCart, Users, Package, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';
import { useTenant } from '@/context/TenantContext';
import { ForecastingService } from '@/lib/ai/forecastingService';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { tenantId } = useTenant();
  const router = useRouter();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tenantId) {
      loadForecastData();
    }
  }, [tenantId]);

  const loadForecastData = async () => {
    try {
      setLoading(true);
      const [alertsData, recsData] = await Promise.all([
        ForecastingService.getAlerts(tenantId!, false).catch(() => []),
        ForecastingService.getRecommendations(tenantId!, 'pending').catch(() => []),
      ]);

      setAlerts((alertsData || []).filter((a: any) => a.priority === 'critical' || a.priority === 'high').slice(0, 3));
      setRecommendations((recsData || []).filter((r: any) => r.priority === 'urgent' || r.priority === 'high').slice(0, 3));
    } catch (error) {
      console.error('Error loading forecast data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-2">Welcome to your POS system</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total Sales Today
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0.00</div>
              <p className="text-xs text-slate-600 mt-1">No sales yet</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Products
              </CardTitle>
              <Package className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-slate-600 mt-1">Add products to start</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Customers
              </CardTitle>
              <Users className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-slate-600 mt-1">No customers yet</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Transactions
              </CardTitle>
              <Store className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-slate-600 mt-1">No transactions</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Start Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                1
              </div>
              <div>
                <p className="font-medium">Add Products</p>
                <p className="text-sm text-slate-600">
                  Go to Products page to add your inventory
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                2
              </div>
              <div>
                <p className="font-medium">Set Up Stock Levels</p>
                <p className="text-sm text-slate-600">
                  Configure stock quantities for your branch
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                3
              </div>
              <div>
                <p className="font-medium">Configure Promotions (Optional)</p>
                <p className="text-sm text-slate-600">
                  Set up group offers, BOGO deals, or time-based discounts
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                4
              </div>
              <div>
                <p className="font-medium">Start Selling</p>
                <p className="text-sm text-slate-600">
                  Go to POS page to start processing sales
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {!loading && (alerts.length > 0 || recommendations.length > 0) && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-orange-900">AI Forecasting Insights</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/dashboard/forecasting')}
                  className="text-orange-700 border-orange-300 hover:bg-orange-100"
                >
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {alerts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-orange-900 mb-2">Critical Alerts</h3>
                  <div className="space-y-2">
                    {alerts.map((alert) => (
                      <div key={alert.id} className="flex items-start gap-2 p-3 bg-white rounded-lg border border-orange-200">
                        <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="destructive" className="text-xs">
                              {alert.priority}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                          <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recommendations.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-orange-900 mb-2">Urgent Reorder Recommendations</h3>
                  <div className="space-y-2">
                    {recommendations.map((rec) => (
                      <div key={rec.id} className="flex items-start gap-2 p-3 bg-white rounded-lg border border-orange-200">
                        <Package className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="default" className="text-xs">
                              {rec.priority}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {rec.recommended_quantity} units
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-gray-900">
                            {rec.products?.name}
                          </p>
                          {rec.reasoning && (
                            <p className="text-xs text-gray-600 mt-1">{rec.reasoning}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
