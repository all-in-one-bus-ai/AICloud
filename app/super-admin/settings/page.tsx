'use client';

import { useState, useEffect } from 'react';
import { SuperAdminLayout } from '@/components/SuperAdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { 
  Settings, Shield, Bell, CreditCard, Package, Building2, 
  Save, RefreshCw, AlertTriangle, Globe, Loader2 
} from 'lucide-react';

interface PlatformSetting {
  id: string;
  key: string;
  value: string;
  value_type: string;
  category: string;
  description: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [originalSettings, setOriginalSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('platform');
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('platform_settings')
      .select('*')
      .order('category');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load settings. Make sure the platform_settings table exists.',
        variant: 'destructive',
      });
    } else if (data) {
      const settingsMap: Record<string, string> = {};
      data.forEach((s: PlatformSetting) => {
        settingsMap[s.key] = s.value || '';
      });
      setSettings(settingsMap);
      setOriginalSettings(settingsMap);
    }
    setLoading(false);
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const hasChanges = () => {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  };

  const saveSettings = async () => {
    setSaving(true);
    
    const updates = Object.entries(settings).filter(
      ([key, value]) => originalSettings[key] !== value
    );

    let hasError = false;
    for (const [key, value] of updates) {
      const { error } = await (supabase as any)
        .from('platform_settings')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key);
      
      if (error) {
        hasError = true;
        console.error(`Failed to update ${key}:`, error);
      }
    }

    // Log the activity
    await (supabase as any).from('activity_logs').insert({
      event_type: 'admin',
      event_name: 'settings_updated',
      description: `Updated ${updates.length} platform settings`,
      severity: 'info',
      metadata: { updated_keys: updates.map(([k]) => k) }
    });

    if (hasError) {
      toast({
        title: 'Partial Error',
        description: 'Some settings failed to save',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });
      setOriginalSettings({ ...settings });
    }
    setSaving(false);
  };

  const renderSwitchSetting = (key: string, label: string, description?: string) => (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      <Switch
        checked={settings[key] === 'true'}
        onCheckedChange={(checked) => updateSetting(key, checked ? 'true' : 'false')}
      />
    </div>
  );

  const renderInputSetting = (key: string, label: string, type: string = 'text', description?: string, placeholder?: string) => (
    <div className="space-y-2 py-3 border-b last:border-0">
      <Label className="text-sm font-medium">{label}</Label>
      {description && <p className="text-xs text-slate-500">{description}</p>}
      <Input
        type={type}
        value={settings[key] || ''}
        onChange={(e) => updateSetting(key, e.target.value)}
        placeholder={placeholder}
        className="max-w-md"
      />
    </div>
  );

  const renderTextareaSetting = (key: string, label: string, description?: string, placeholder?: string) => (
    <div className="space-y-2 py-3 border-b last:border-0">
      <Label className="text-sm font-medium">{label}</Label>
      {description && <p className="text-xs text-slate-500">{description}</p>}
      <Textarea
        value={settings[key] || ''}
        onChange={(e) => updateSetting(key, e.target.value)}
        placeholder={placeholder}
        className="max-w-md"
        rows={3}
      />
    </div>
  );

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Platform Settings</h1>
            <p className="text-slate-600 mt-2">Configure global platform settings and preferences</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadSettings} disabled={saving}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              onClick={saveSettings} 
              disabled={!hasChanges() || saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        {hasChanges() && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="text-amber-800 text-sm">You have unsaved changes</span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-6 w-full max-w-3xl">
            <TabsTrigger value="platform" className="flex items-center gap-1">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Platform</span>
            </TabsTrigger>
            <TabsTrigger value="registration" className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Registration</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="demo" className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Demo</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-1">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-1">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="platform" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  Platform Settings
                </CardTitle>
                <CardDescription>Basic platform configuration and branding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {renderInputSetting('platform_name', 'Platform Name', 'text', 'The name displayed across the platform', 'CloudPOS')}
                {renderInputSetting('support_email', 'Support Email', 'email', 'Email address for customer support', 'support@example.com')}
                {renderInputSetting('support_phone', 'Support Phone', 'tel', 'Phone number for customer support', '+1 234 567 8900')}
                {renderInputSetting('terms_url', 'Terms of Service URL', 'url', 'Link to your terms of service page', 'https://...')}
                {renderInputSetting('privacy_url', 'Privacy Policy URL', 'url', 'Link to your privacy policy page', 'https://...')}
                
                <div className="pt-4 mt-4 border-t">
                  <h4 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Maintenance Mode
                  </h4>
                  {renderSwitchSetting('maintenance_mode', 'Enable Maintenance Mode', 'Temporarily disable access to the platform')}
                  {settings.maintenance_mode === 'true' && (
                    <div className="mt-3">
                      {renderTextareaSetting('maintenance_message', 'Maintenance Message', 'Message shown to users during maintenance')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="registration" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-green-600" />
                  Business Registration Settings
                </CardTitle>
                <CardDescription>Configure how new businesses can register and their default limits</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {renderSwitchSetting('auto_approve_businesses', 'Auto-approve New Businesses', 'Skip manual approval for new registrations')}
                {renderSwitchSetting('require_email_verification', 'Require Email Verification', 'Users must verify email before accessing account')}
                
                <div className="pt-4 mt-4 border-t">
                  <h4 className="font-semibold mb-3">Free Plan Limits</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {renderInputSetting('max_branches_free', 'Max Branches (Free)', 'number', 'Maximum branches for free plan')}
                    {renderInputSetting('max_users_free', 'Max Users (Free)', 'number', 'Maximum staff users for free plan')}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t">
                  <h4 className="font-semibold mb-3">Premium Plan Limits</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {renderInputSetting('max_branches_premium', 'Max Branches (Premium)', 'number', 'Maximum branches for premium plan')}
                    {renderInputSetting('max_users_premium', 'Max Users (Premium)', 'number', 'Maximum staff users for premium plan')}
                  </div>
                </div>

                {renderInputSetting('trial_period_days', 'Trial Period (Days)', 'number', 'Number of days for free trial')}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-red-600" />
                  Security Settings
                </CardTitle>
                <CardDescription>Configure security policies and authentication settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {renderInputSetting('password_min_length', 'Minimum Password Length', 'number', 'Minimum characters required for passwords')}
                {renderSwitchSetting('require_2fa_admins', 'Require 2FA for Admins', 'Force two-factor authentication for admin users')}
                {renderInputSetting('session_timeout_minutes', 'Session Timeout (Minutes)', 'number', 'Auto-logout after inactivity')}
                
                <div className="pt-4 mt-4 border-t">
                  <h4 className="font-semibold mb-3">Login Protection</h4>
                  {renderInputSetting('max_login_attempts', 'Max Login Attempts', 'number', 'Lock account after this many failed attempts')}
                  {renderInputSetting('lockout_duration_minutes', 'Lockout Duration (Minutes)', 'number', 'How long to lock account after failed attempts')}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="demo" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-600" />
                  Demo Products Settings
                </CardTitle>
                <CardDescription>Configure demo products availability for businesses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {renderSwitchSetting('demo_products_enabled', 'Enable Demo Products', 'Allow businesses to access demo product catalog')}
                {renderSwitchSetting('demo_products_auto_enable', 'Auto-enable for New Businesses', 'Automatically enable demo products for newly registered businesses')}
                {renderInputSetting('demo_tenant_id', 'Demo Products Source Tenant', 'text', 'Tenant ID containing the demo products')}
                
                <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">Demo Products Info</h4>
                  <p className="text-sm text-purple-700">
                    Demo products are sourced from a designated tenant and made available to other businesses 
                    when enabled. This helps new users explore the system without adding their own inventory.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-yellow-600" />
                  Notification Settings
                </CardTitle>
                <CardDescription>Configure alerts and notification preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {renderSwitchSetting('notify_new_signup', 'Notify on New Signup', 'Send email when a new business registers')}
                {renderInputSetting('notify_email', 'Admin Notification Email', 'email', 'Email to receive admin notifications', 'admin@example.com')}
                {renderInputSetting('low_stock_threshold', 'Default Low Stock Threshold', 'number', 'Default threshold for low stock alerts')}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                  Billing Settings
                </CardTitle>
                <CardDescription>Configure default billing and invoice settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="space-y-2 py-3 border-b">
                  <Label className="text-sm font-medium">Default Currency</Label>
                  <p className="text-xs text-slate-500">Currency used for billing and invoices</p>
                  <Select 
                    value={settings.default_currency || 'GBP'} 
                    onValueChange={(value) => updateSetting('default_currency', value)}
                  >
                    <SelectTrigger className="max-w-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GBP">GBP (£) - British Pound</SelectItem>
                      <SelectItem value="USD">USD ($) - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
                      <SelectItem value="BDT">BDT (৳) - Bangladeshi Taka</SelectItem>
                      <SelectItem value="INR">INR (₹) - Indian Rupee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {renderInputSetting('default_tax_rate', 'Default Tax Rate (%)', 'number', 'Default VAT/tax percentage for invoices')}
                {renderInputSetting('invoice_prefix', 'Invoice Prefix', 'text', 'Prefix for invoice numbers', 'INV-')}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  );
}
