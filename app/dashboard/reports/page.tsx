'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useTenant } from '@/context/TenantContext';
import { BarChart3, TrendingUp, DollarSign, ShoppingCart, Users, Package } from 'lucide-react';
import { StatsCard } from '@/components/StatsCard';

export default function ReportsPage() {
  const [period, setPeriod] = useState('30');
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalProducts: 0,
    avgTransaction: 0,
    topProduct: 'N/A',
  });
  const { tenantId } = useTenant();

  useEffect(() => {
    if (tenantId) fetchStats();
  }, [tenantId, period]);

  const fetchStats = async () => {
    const daysAgo = parseInt(period);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    const { data: sales } = await (supabase as any)
      .from('sales')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('created_at', date.toISOString());

    const { data: customers } = await (supabase as any)
      .from('customers')
      .select('id')
      .eq('tenant_id', tenantId);

    const { data: products } = await (supabase as any)
      .from('products')
      .select('id')
      .eq('tenant_id', tenantId);

    if (sales) {
      const totalRevenue = sales.reduce((sum: number, s: any) => sum + s.total_amount, 0);
      setStats({
        totalSales: sales.length,
        totalRevenue,
        totalCustomers: customers?.length || 0,
        totalProducts: products?.length || 0,
        avgTransaction: sales.length ? totalRevenue / sales.length : 0,
        topProduct: 'Product A',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Advanced Reports</h1>
            <p className="text-slate-600 mt-1">Detailed business analytics and insights</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="365">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard title="Total Sales" value={stats.totalSales} subtitle={`Last ${period} days`} icon={ShoppingCart} />
          <StatsCard title="Total Revenue" value={`£${stats.totalRevenue.toFixed(2)}`} subtitle={`Last ${period} days`} icon={DollarSign} />
          <StatsCard title="Avg Transaction" value={`£${stats.avgTransaction.toFixed(2)}`} subtitle="Per sale" icon={TrendingUp} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Customer Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Customers</span>
                  <span className="font-semibold">{stats.totalCustomers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">New This Period</span>
                  <span className="font-semibold">-</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Loyalty Members</span>
                  <span className="font-semibold">-</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventory Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Products</span>
                  <span className="font-semibold">{stats.totalProducts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Top Selling</span>
                  <span className="font-semibold">{stats.topProduct}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Low Stock Items</span>
                  <span className="font-semibold text-orange-600">-</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Sales Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-slate-500">
              Sales chart visualization will appear here
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Export Options</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline">Export Sales Report (CSV)</Button>
              <Button className="w-full" variant="outline">Export Customer List (CSV)</Button>
              <Button className="w-full" variant="outline">Export Inventory Report (CSV)</Button>
              <Button className="w-full" variant="outline">Export Financial Summary (PDF)</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline">Generate End of Day Report</Button>
              <Button className="w-full" variant="outline">Generate Monthly Summary</Button>
              <Button className="w-full" variant="outline">Tax Report (HMRC)</Button>
              <Button className="w-full" variant="outline">Profit & Loss Statement</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
