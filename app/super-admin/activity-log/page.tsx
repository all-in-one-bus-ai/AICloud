'use client';

import { useState, useEffect } from 'react';
import { SuperAdminLayout } from '@/components/SuperAdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { 
  Activity, Search, RefreshCw, Download, Filter, ChevronLeft, ChevronRight,
  Shield, User, Building2, AlertTriangle, Settings, Clock, Loader2,
  LogIn, LogOut, UserPlus, UserMinus, CheckCircle, XCircle, Eye
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ActivityLog {
  id: string;
  event_type: string;
  event_name: string;
  description: string | null;
  severity: string;
  user_id: string | null;
  user_email: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  auth: { label: 'Authentication', icon: LogIn, color: 'bg-blue-100 text-blue-700' },
  admin: { label: 'Admin Action', icon: Shield, color: 'bg-purple-100 text-purple-700' },
  business: { label: 'Business', icon: Building2, color: 'bg-green-100 text-green-700' },
  security: { label: 'Security', icon: AlertTriangle, color: 'bg-red-100 text-red-700' },
  system: { label: 'System', icon: Settings, color: 'bg-slate-100 text-slate-700' },
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  info: { label: 'Info', color: 'bg-blue-100 text-blue-700' },
  warning: { label: 'Warning', color: 'bg-yellow-100 text-yellow-700' },
  error: { label: 'Error', color: 'bg-red-100 text-red-700' },
  critical: { label: 'Critical', color: 'bg-red-600 text-white' },
};

const EVENT_ICONS: Record<string, any> = {
  login_success: LogIn,
  login_failed: XCircle,
  logout: LogOut,
  signup: UserPlus,
  user_created: UserPlus,
  user_deleted: UserMinus,
  settings_updated: Settings,
  business_approved: CheckCircle,
  business_rejected: XCircle,
  business_suspended: AlertTriangle,
  demo_products_toggled: Building2,
  features_updated: Settings,
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const itemsPerPage = 25;
  const { toast } = useToast();

  useEffect(() => {
    loadLogs();
  }, [currentPage, eventTypeFilter, severityFilter]);

  const loadLogs = async () => {
    setLoading(true);
    
    let query = supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

    if (eventTypeFilter !== 'all') {
      query = query.eq('event_type', eventTypeFilter);
    }

    if (severityFilter !== 'all') {
      query = query.eq('severity', severityFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load activity logs',
        variant: 'destructive',
      });
    } else {
      setLogs((data as ActivityLog[]) || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      log.event_name.toLowerCase().includes(search) ||
      log.description?.toLowerCase().includes(search) ||
      log.user_email?.toLowerCase().includes(search) ||
      log.tenant_name?.toLowerCase().includes(search)
    );
  });

  const exportLogs = async () => {
    toast({
      title: 'Exporting...',
      description: 'Preparing CSV export',
    });

    // Fetch all logs for export
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10000);

    if (data) {
      const csv = [
        ['Timestamp', 'Event Type', 'Event Name', 'Description', 'Severity', 'User Email', 'Tenant', 'IP Address'].join(','),
        ...data.map((log: ActivityLog) => [
          format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
          log.event_type,
          log.event_name,
          `"${(log.description || '').replace(/"/g, '""')}"`,
          log.severity,
          log.user_email || '',
          log.tenant_name || '',
          log.ip_address || ''
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: `Exported ${data.length} log entries`,
      });
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const getEventIcon = (eventName: string, eventType: string) => {
    const Icon = EVENT_ICONS[eventName] || EVENT_TYPE_CONFIG[eventType]?.icon || Activity;
    return Icon;
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Activity Log</h1>
            <p className="text-slate-600 mt-2">Monitor platform activity and audit trail</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={exportLogs}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Events</p>
                  <p className="text-2xl font-bold">{totalCount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Warnings</p>
                  <p className="text-2xl font-bold">
                    {logs.filter(l => l.severity === 'warning').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Errors</p>
                  <p className="text-2xl font-bold">
                    {logs.filter(l => l.severity === 'error' || l.severity === 'critical').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Today&apos;s Events</p>
                  <p className="text-2xl font-bold">
                    {logs.filter(l => {
                      const today = new Date();
                      const logDate = new Date(l.created_at);
                      return logDate.toDateString() === today.toDateString();
                    }).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search events, users, businesses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="auth">Authentication</SelectItem>
                  <SelectItem value="admin">Admin Actions</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Activity List */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Events</CardTitle>
            <CardDescription>
              Showing {filteredLogs.length} of {totalCount} events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No activity logs found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log) => {
                  const EventIcon = getEventIcon(log.event_name, log.event_type);
                  const typeConfig = EVENT_TYPE_CONFIG[log.event_type] || { color: 'bg-slate-100 text-slate-700' };
                  const severityConfig = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.info;
                  
                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                        <EventIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{log.event_name.replace(/_/g, ' ')}</span>
                          <Badge variant="outline" className={typeConfig.color}>
                            {EVENT_TYPE_CONFIG[log.event_type]?.label || log.event_type}
                          </Badge>
                          <Badge variant="outline" className={severityConfig.color}>
                            {severityConfig.label}
                          </Badge>
                        </div>
                        {log.description && (
                          <p className="text-sm text-slate-600 mt-1 truncate">{log.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          {log.user_email && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {log.user_email}
                            </span>
                          )}
                          {log.tenant_name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {log.tenant_name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <p className="text-sm text-slate-600">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Log Detail Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Details
              </DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Event Type</p>
                    <Badge className={EVENT_TYPE_CONFIG[selectedLog.event_type]?.color}>
                      {EVENT_TYPE_CONFIG[selectedLog.event_type]?.label || selectedLog.event_type}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Severity</p>
                    <Badge className={SEVERITY_CONFIG[selectedLog.severity]?.color}>
                      {SEVERITY_CONFIG[selectedLog.severity]?.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Event Name</p>
                    <p className="font-medium">{selectedLog.event_name.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Timestamp</p>
                    <p className="font-medium">
                      {format(new Date(selectedLog.created_at), 'PPpp')}
                    </p>
                  </div>
                  {selectedLog.user_email && (
                    <div>
                      <p className="text-sm text-slate-500">User</p>
                      <p className="font-medium">{selectedLog.user_email}</p>
                    </div>
                  )}
                  {selectedLog.tenant_name && (
                    <div>
                      <p className="text-sm text-slate-500">Business</p>
                      <p className="font-medium">{selectedLog.tenant_name}</p>
                    </div>
                  )}
                  {selectedLog.ip_address && (
                    <div>
                      <p className="text-sm text-slate-500">IP Address</p>
                      <p className="font-medium font-mono">{selectedLog.ip_address}</p>
                    </div>
                  )}
                </div>
                
                {selectedLog.description && (
                  <div>
                    <p className="text-sm text-slate-500">Description</p>
                    <p className="mt-1">{selectedLog.description}</p>
                  </div>
                )}
                
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <p className="text-sm text-slate-500 mb-2">Additional Data</p>
                    <pre className="p-3 bg-slate-100 rounded-lg text-xs overflow-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
                
                {selectedLog.user_agent && (
                  <div>
                    <p className="text-sm text-slate-500">User Agent</p>
                    <p className="text-xs font-mono mt-1 text-slate-600 break-all">
                      {selectedLog.user_agent}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
}
