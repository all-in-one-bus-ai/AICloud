'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useTenant } from '@/context/TenantContext';
import { Search, Activity, User, Clock } from 'lucide-react';

interface ActivityLog {
  id: string;
  action_type: string;
  description: string;
  user_id: string;
  table_name: string | null;
  record_id: string | null;
  metadata: any;
  created_at: string;
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const { tenantId } = useTenant();

  useEffect(() => {
    if (tenantId) fetchLogs();
  }, [tenantId]);

  useEffect(() => {
    filterLogs();
  }, [searchQuery, actionFilter, logs]);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('activity_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) setLogs(data);
    setLoading(false);
  };

  const filterLogs = () => {
    let filtered = [...logs];
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action_type === actionFilter);
    }
    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action_type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredLogs(filtered);
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      'create': 'bg-green-100 text-green-700',
      'update': 'bg-blue-100 text-blue-700',
      'delete': 'bg-red-100 text-red-700',
      'login': 'bg-slate-100 text-slate-700',
    };
    return colors[action] || 'bg-slate-100 text-slate-700';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Activity Logs</h1>
          <p className="text-slate-600 mt-1">View audit trail and system activity logs</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <CardTitle>Recent Activity ({filteredLogs.length})</CardTitle>
              <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-600">No activity logs found</div>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={getActionColor(log.action_type)}>
                            {log.action_type.toUpperCase()}
                          </Badge>
                          {log.table_name && (
                            <span className="text-sm text-slate-600">
                              {log.table_name}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-900 mb-2">{log.description}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                          {log.user_id && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              User ID: {log.user_id.substring(0, 8)}...
                            </span>
                          )}
                        </div>
                      </div>
                      <Activity className="h-5 w-5 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
              <Activity className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{logs.length}</div>
              <p className="text-xs text-slate-600 mt-1">Last 100 actions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Clock className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length}
              </div>
              <p className="text-xs text-slate-600 mt-1">Actions today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Common</CardTitle>
              <Activity className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {logs.length > 0 ? logs[0].action_type : '-'}
              </div>
              <p className="text-xs text-slate-600 mt-1">Action type</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
