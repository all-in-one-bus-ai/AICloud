'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Lock, Activity, Key } from 'lucide-react';
import { useTenant } from '@/context/TenantContext';
import { getSecuritySettings, upsertSecuritySettings, getAccessLogs, type SecuritySettings } from '@/lib/settings/securitySettingsService';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { SuccessDialog } from '@/components/SuccessDialog';

export function SecurityTab() {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const [securitySettings, setSecuritySettings] = useState<Partial<SecuritySettings>>({
    require_pin_for_refunds: true,
    require_manager_approval: false,
    manager_approval_threshold: 100.0,
    enable_2fa: false,
    session_timeout_minutes: 60,
    lock_screen_after_minutes: 15,
    require_biometric: false,
    log_all_actions: true,
    password_min_length: 8,
    password_require_special: false,
    password_expiry_days: 90,
  });

  useEffect(() => {
    if (tenantId) {
      loadSettings();
      loadUsers();
      loadAccessLogs();
    }
  }, [tenantId]);

  const loadSettings = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const settings = await getSecuritySettings(tenantId);
      if (settings) {
        setSecuritySettings(settings);
      }
    } catch (error) {
      console.error('Error loading security settings:', error);
      toast.error('Failed to load security settings');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadAccessLogs = async () => {
    if (!tenantId) return;

    try {
      const logs = await getAccessLogs(tenantId, 20);
      setAccessLogs(logs);
    } catch (error) {
      console.error('Error loading access logs:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      await upsertSecuritySettings({ ...securitySettings, tenant_id: tenantId } as SecuritySettings);
      setShowSuccessDialog(true);
    } catch (error) {
      toast.error('Failed to save security settings');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'cashier':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage staff accounts and permissions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-8">No users found</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Name</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Email</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Role</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium">{user.full_name}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{user.email}</td>
                        <td className="px-4 py-3">
                          <Badge className={getRoleBadgeColor(user.role)}>{user.role}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={user.is_active ? 'default' : 'secondary'}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Lock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <CardTitle>Authentication Settings</CardTitle>
              <CardDescription>Configure password policies and authentication methods</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">PIN & Approvals</h4>
            <div className="flex items-center justify-between">
              <div>
                <Label>Require PIN for Refunds</Label>
                <p className="text-xs text-slate-500">Require manager PIN to process refunds</p>
              </div>
              <Switch
                checked={securitySettings.require_pin_for_refunds}
                onCheckedChange={(checked) =>
                  setSecuritySettings({ ...securitySettings, require_pin_for_refunds: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Require Manager Approval</Label>
                <p className="text-xs text-slate-500">Large discounts need manager approval</p>
              </div>
              <Switch
                checked={securitySettings.require_manager_approval}
                onCheckedChange={(checked) =>
                  setSecuritySettings({ ...securitySettings, require_manager_approval: checked })
                }
              />
            </div>
            {securitySettings.require_manager_approval && (
              <div className="space-y-2 ml-6">
                <Label>Approval Threshold (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={securitySettings.manager_approval_threshold}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      manager_approval_threshold: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Password Policy</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minimum Password Length</Label>
                <Input
                  type="number"
                  min="6"
                  max="20"
                  value={securitySettings.password_min_length}
                  onChange={(e) =>
                    setSecuritySettings({ ...securitySettings, password_min_length: parseInt(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Password Expiry (days)</Label>
                <Input
                  type="number"
                  min="30"
                  max="365"
                  value={securitySettings.password_expiry_days}
                  onChange={(e) =>
                    setSecuritySettings({ ...securitySettings, password_expiry_days: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Require Special Characters</Label>
              <Switch
                checked={securitySettings.password_require_special}
                onCheckedChange={(checked) =>
                  setSecuritySettings({ ...securitySettings, password_require_special: checked })
                }
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Two-Factor Authentication</h4>
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable 2FA</Label>
                <p className="text-xs text-slate-500">Require 2FA for all users</p>
              </div>
              <Switch
                checked={securitySettings.enable_2fa}
                onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, enable_2fa: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Require Biometric</Label>
                <p className="text-xs text-slate-500">Enable fingerprint/face recognition if available</p>
              </div>
              <Switch
                checked={securitySettings.require_biometric}
                onCheckedChange={(checked) =>
                  setSecuritySettings({ ...securitySettings, require_biometric: checked })
                }
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveSettings} disabled={loading}>
              Save Authentication Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Key className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>Session & Lock Settings</CardTitle>
              <CardDescription>Configure session timeouts and screen lock behavior</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Session Timeout (minutes)</Label>
              <Input
                type="number"
                min="5"
                max="480"
                value={securitySettings.session_timeout_minutes}
                onChange={(e) =>
                  setSecuritySettings({ ...securitySettings, session_timeout_minutes: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-slate-500">Auto-logout after inactivity</p>
            </div>
            <div className="space-y-2">
              <Label>Lock Screen After (minutes)</Label>
              <Input
                type="number"
                min="1"
                max="60"
                value={securitySettings.lock_screen_after_minutes}
                onChange={(e) =>
                  setSecuritySettings({ ...securitySettings, lock_screen_after_minutes: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-slate-500">Lock screen after inactivity</p>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveSettings} disabled={loading}>
              Save Session Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Activity className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <CardTitle>Activity Monitoring</CardTitle>
              <CardDescription>View recent activity and access logs</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Log All Actions</Label>
              <p className="text-xs text-slate-500">Record all user actions for audit trail</p>
            </div>
            <Switch
              checked={securitySettings.log_all_actions}
              onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, log_all_actions: checked })}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Recent Activity (Last 20)</h4>
            {accessLogs.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-8">No activity logs found</p>
            ) : (
              <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-slate-700">Time</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-slate-700">User</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-slate-700">Action</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-slate-700">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accessLogs.map((log, index) => (
                      <tr key={index} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-2 text-xs text-slate-600">
                          {new Date(log.created_at).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-2 text-xs">{log.user_id?.substring(0, 8)}...</td>
                        <td className="px-4 py-2 text-xs font-medium">{log.action || 'N/A'}</td>
                        <td className="px-4 py-2 text-xs text-slate-600">{log.details || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <SuccessDialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
        title="Security Settings Saved"
        description="Your security settings have been saved successfully."
      />
    </div>
  );
}
