'use client';

import { SuperAdminLayout } from '@/components/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Package, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    totalTenants: 0,
    pendingApprovals: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const { data: tenantsData } = await supabase
      .from('tenants')
      .select('*');

    const { data: subscriptionsData } = await supabase
      .from('tenant_subscriptions')
      .select('*')
      .eq('status', 'active');

    const tenants: any = tenantsData;
    const subscriptions: any = subscriptionsData;

    const pendingCount = tenants?.filter((t: any) => t.status === 'pending').length || 0;

    setStats({
      totalTenants: tenants?.length || 0,
      pendingApprovals: pendingCount,
      activeSubscriptions: subscriptions?.length || 0,
      totalRevenue: 0,
    });
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Super Admin Dashboard</h1>
          <p className="text-slate-600 mt-2">Platform overview and management</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total Businesses
              </CardTitle>
              <Building2 className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTenants}</div>
              <p className="text-xs text-slate-600 mt-1">Registered tenants</p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">
                Pending Approvals
              </CardTitle>
              <Users className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700">{stats.pendingApprovals}</div>
              <p className="text-xs text-orange-600 mt-1">Awaiting review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Active Subscriptions
              </CardTitle>
              <Package className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
              <p className="text-xs text-slate-600 mt-1">Current subscribers</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-700">
                Monthly Revenue
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">${stats.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-green-600 mt-1">This month</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">No recent activity</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Database</span>
                  <span className="text-sm font-medium text-green-600">Healthy</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">API</span>
                  <span className="text-sm font-medium text-green-600">Healthy</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Storage</span>
                  <span className="text-sm font-medium text-green-600">Healthy</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
