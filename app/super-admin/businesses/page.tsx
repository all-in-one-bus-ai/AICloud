'use client';

import { SuperAdminLayout } from '@/components/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, CheckCircle, XCircle, Clock, Settings, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  status: string;
  created_at: string;
  approved_at: string | null;
  subscription_id: string | null;
}

interface FeatureFlags {
  feature_suppliers: boolean;
  feature_expenses: boolean;
  feature_staff: boolean;
  feature_attendance: boolean;
  feature_audit_logs: boolean;
  feature_payroll: boolean;
  feature_returns: boolean;
  feature_gift_cards: boolean;
  feature_invoices: boolean;
  feature_credit_sales: boolean;
  feature_advanced_reports: boolean;
  feature_auto_reordering: boolean;
  feature_restaurant_mode: boolean;
  feature_ecommerce: boolean;
  feature_api_access: boolean;
  feature_warehouses: boolean;
  feature_manufacturing: boolean;
  feature_bookings: boolean;
  feature_delivery: boolean;
  feature_assets: boolean;
  feature_documents: boolean;
  feature_crm: boolean;
  feature_tasks: boolean;
  feature_email_marketing: boolean;
  feature_self_checkout: boolean;
}

interface FeatureSection {
  title: string;
  description: string;
  features: Array<{
    key: keyof FeatureFlags;
    label: string;
    description?: string;
  }>;
}

const FEATURE_SECTIONS: FeatureSection[] = [
  {
    title: 'Core POS',
    description: 'Essential point-of-sale features',
    features: [
      { key: 'feature_suppliers', label: 'Suppliers & Purchases', description: 'Manage suppliers and purchase orders' },
      { key: 'feature_expenses', label: 'Expense Tracking', description: 'Track business expenses and categories' },
    ],
  },
  {
    title: 'Sales & Returns',
    description: 'Sales management and refund processing',
    features: [
      { key: 'feature_returns', label: 'Returns & Refunds', description: 'Process returns and issue refunds' },
      { key: 'feature_gift_cards', label: 'Gift Cards & Vouchers', description: 'Issue and manage gift cards' },
      { key: 'feature_invoices', label: 'Invoices', description: 'Create and manage invoices' },
      { key: 'feature_credit_sales', label: 'Credit Sales', description: 'Allow customers to buy on credit' },
    ],
  },
  {
    title: 'HR & Attendance',
    description: 'Staff management and payroll',
    features: [
      { key: 'feature_staff', label: 'Staff Management', description: 'Manage staff profiles and permissions' },
      { key: 'feature_attendance', label: 'Attendance Tracking', description: 'Clock in/out and time tracking' },
      { key: 'feature_payroll', label: 'UK Payroll & HMRC', description: 'Full payroll with HMRC compliance' },
    ],
  },
  {
    title: 'Operations',
    description: 'Business operations and logistics',
    features: [
      { key: 'feature_warehouses', label: 'Multi-Warehouse', description: 'Manage multiple warehouse locations' },
      { key: 'feature_auto_reordering', label: 'Auto Reordering', description: 'Automatic stock reorder triggers' },
      { key: 'feature_restaurant_mode', label: 'Restaurant Mode', description: 'Table management for restaurants' },
      { key: 'feature_delivery', label: 'Delivery Management', description: 'Track deliveries and drivers' },
      { key: 'feature_bookings', label: 'Bookings & Appointments', description: 'Schedule and manage bookings' },
      { key: 'feature_manufacturing', label: 'Manufacturing', description: 'Assembly and production tracking' },
    ],
  },
  {
    title: 'Management & Assets',
    description: 'Asset and document management',
    features: [
      { key: 'feature_assets', label: 'Asset Management', description: 'Track business assets and equipment' },
      { key: 'feature_documents', label: 'Document Management', description: 'Store and organize documents' },
      { key: 'feature_crm', label: 'CRM', description: 'Customer relationship management' },
      { key: 'feature_tasks', label: 'Tasks & Projects', description: 'Task and project management' },
      { key: 'feature_audit_logs', label: 'Activity Logs', description: 'Audit trail and activity monitoring' },
    ],
  },
  {
    title: 'Marketing & Integration',
    description: 'Marketing tools and integrations',
    features: [
      { key: 'feature_email_marketing', label: 'Email Marketing', description: 'Email campaigns and newsletters' },
      { key: 'feature_ecommerce', label: 'E-commerce Integration', description: 'Sync with online stores' },
      { key: 'feature_api_access', label: 'API & Webhooks', description: 'REST API and webhook integration' },
    ],
  },
  {
    title: 'Advanced Features',
    description: 'Premium and advanced capabilities',
    features: [
      { key: 'feature_advanced_reports', label: 'Advanced Reports', description: 'Detailed analytics and insights' },
      { key: 'feature_self_checkout', label: 'Self-Checkout', description: 'Customer self-service kiosks' },
    ],
  },
];

interface SubscriptionPlan {
  id: string;
  name: string;
  features: any;
}

export default function BusinessesPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [featuresDialogOpen, setFeaturesDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags | null>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadTenants();
    loadSubscriptionPlans();
  }, []);

  useEffect(() => {
    filterTenants();
  }, [searchQuery, statusFilter, tenants]);

  const loadTenants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTenants(data as any);
    }
    setLoading(false);
  };

  const loadSubscriptionPlans = async () => {
    const { data } = await supabase
      .from('subscription_plans')
      .select('id, name, features')
      .eq('is_active', true)
      .order('display_order');

    if (data) {
      setSubscriptionPlans(data as any);
    }
  };

  const filterTenants = () => {
    let filtered = [...tenants];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.slug.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTenants(filtered);
  };

  const approveTenant = async (tenantId: string) => {
    if (!user) return;

    const updateData: any = {
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    };

    const { error } = await (supabase as any)
      .from('tenants')
      .update(updateData)
      .eq('id', tenantId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve business',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Business approved successfully',
      });
      loadTenants();
    }
  };

  const rejectTenant = async (tenantId: string) => {
    const updateData: any = {
      status: 'rejected',
    };

    const { error } = await (supabase as any)
      .from('tenants')
      .update(updateData)
      .eq('id', tenantId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject business',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Business rejected',
      });
      loadTenants();
    }
  };

  const suspendTenant = async (tenantId: string) => {
    const updateData: any = {
      status: 'suspended',
    };

    const { error } = await (supabase as any)
      .from('tenants')
      .update(updateData)
      .eq('id', tenantId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to suspend business',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Business suspended',
      });
      loadTenants();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-700">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
      case 'suspended':
        return <Badge className="bg-slate-100 text-slate-700">Suspended</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const openFeaturesDialog = async (tenant: Tenant) => {
    setSelectedTenant(tenant);

    const { data, error } = await (supabase as any)
      .from('tenant_feature_flags')
      .select('*')
      .eq('tenant_id', tenant.id)
      .maybeSingle();

    if (data) {
      setFeatureFlags(data);
    } else {
      setFeatureFlags({
        feature_suppliers: true,
        feature_expenses: true,
        feature_staff: true,
        feature_attendance: true,
        feature_audit_logs: true,
        feature_payroll: false,
        feature_returns: true,
        feature_gift_cards: true,
        feature_invoices: true,
        feature_credit_sales: true,
        feature_advanced_reports: false,
        feature_auto_reordering: false,
        feature_restaurant_mode: false,
        feature_ecommerce: false,
        feature_api_access: false,
        feature_warehouses: false,
        feature_manufacturing: false,
        feature_bookings: false,
        feature_delivery: false,
        feature_assets: false,
        feature_documents: false,
        feature_crm: false,
        feature_tasks: false,
        feature_email_marketing: false,
        feature_self_checkout: false,
      });
    }

    setFeaturesDialogOpen(true);
  };

  const saveFeatures = async () => {
    if (!selectedTenant || !featureFlags) return;

    const { data: existing } = await (supabase as any)
      .from('tenant_feature_flags')
      .select('id')
      .eq('tenant_id', selectedTenant.id)
      .maybeSingle();

    let error;
    if (existing) {
      const result = await (supabase as any)
        .from('tenant_feature_flags')
        .update(featureFlags)
        .eq('tenant_id', selectedTenant.id);
      error = result.error;
    } else {
      const result = await (supabase as any)
        .from('tenant_feature_flags')
        .insert({ ...featureFlags, tenant_id: selectedTenant.id });
      error = result.error;
    }

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save features',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Features updated successfully',
      });
      setFeaturesDialogOpen(false);
    }
  };

  const toggleFeature = (feature: keyof FeatureFlags) => {
    if (!featureFlags) return;
    setFeatureFlags({
      ...featureFlags,
      [feature]: !featureFlags[feature],
    });
  };

  const enableAllInSection = (section: FeatureSection) => {
    if (!featureFlags) return;
    const updates: Partial<FeatureFlags> = {};
    section.features.forEach(feature => {
      updates[feature.key] = true;
    });
    setFeatureFlags({
      ...featureFlags,
      ...updates,
    });
  };

  const disableAllInSection = (section: FeatureSection) => {
    if (!featureFlags) return;
    const updates: Partial<FeatureFlags> = {};
    section.features.forEach(feature => {
      updates[feature.key] = false;
    });
    setFeatureFlags({
      ...featureFlags,
      ...updates,
    });
  };

  const enableAllFeatures = () => {
    if (!featureFlags) return;
    const allEnabled: any = {};
    Object.keys(featureFlags).forEach(key => {
      if (key.startsWith('feature_')) {
        allEnabled[key] = true;
      }
    });
    setFeatureFlags({
      ...featureFlags,
      ...allEnabled,
    });
  };

  const disableAllFeatures = () => {
    if (!featureFlags) return;
    const allDisabled: any = {};
    Object.keys(featureFlags).forEach(key => {
      if (key.startsWith('feature_')) {
        allDisabled[key] = false;
      }
    });
    setFeatureFlags({
      ...featureFlags,
      ...allDisabled,
    });
  };

  const applyPlan = () => {
    if (!selectedPlan || !featureFlags) return;

    const plan = subscriptionPlans.find(p => p.id === selectedPlan);
    if (!plan || !plan.features) return;

    setFeatureFlags({
      ...featureFlags,
      ...plan.features,
    });

    toast({
      title: 'Plan Applied',
      description: `${plan.name} plan features have been applied. Click Save to confirm.`,
    });
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Business Management</h1>
          <p className="text-slate-600 mt-2">Approve and manage registered businesses</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <CardTitle>All Businesses ({filteredTenants.length})</CardTitle>
              <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search businesses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
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
            ) : filteredTenants.length === 0 ? (
              <div className="text-center py-12 text-slate-600">
                No businesses found
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTenants.map((tenant) => (
                  <div
                    key={tenant.id}
                    className="border rounded-lg p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{tenant.name}</h3>
                          {getStatusBadge(tenant.status)}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                          <div>
                            <span className="font-medium">Email:</span> {tenant.email || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Slug:</span> {tenant.slug}
                          </div>
                          <div>
                            <span className="font-medium">Registered:</span>{' '}
                            {new Date(tenant.created_at).toLocaleDateString()}
                          </div>
                          {tenant.approved_at && (
                            <div>
                              <span className="font-medium">Approved:</span>{' '}
                              {new Date(tenant.approved_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openFeaturesDialog(tenant)}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Features
                        </Button>
                        {tenant.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => approveTenant(tenant.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectTenant(tenant.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        {tenant.status === 'approved' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => suspendTenant(tenant.id)}
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Suspend
                          </Button>
                        )}
                        {tenant.status === 'suspended' && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => approveTenant(tenant.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={featuresDialogOpen} onOpenChange={setFeaturesDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                Manage Features - {selectedTenant?.name}
              </DialogTitle>
              <p className="text-sm text-slate-600 mt-1">
                Enable or disable modules for this business. Changes take effect immediately after saving.
              </p>
            </DialogHeader>
            {featureFlags && (
              <div className="space-y-6">
                <div className="border rounded-lg p-4 bg-blue-50 space-y-3">
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 mb-1">Quick Apply Plan</h4>
                      <p className="text-sm text-blue-700 mb-3">
                        Select a subscription plan to instantly apply all its features
                      </p>
                      <div className="flex gap-2">
                        <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                          <SelectTrigger className="flex-1 bg-white">
                            <SelectValue placeholder="Choose a plan..." />
                          </SelectTrigger>
                          <SelectContent>
                            {subscriptionPlans.map(plan => (
                              <SelectItem key={plan.id} value={plan.id}>
                                {plan.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={applyPlan}
                          disabled={!selectedPlan}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Apply Plan
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pb-4 border-b">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={enableAllFeatures}
                    className="flex-1"
                  >
                    Enable All Modules
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={disableAllFeatures}
                    className="flex-1"
                  >
                    Disable All Modules
                  </Button>
                </div>

                {FEATURE_SECTIONS.map((section, sectionIndex) => (
                  <div key={sectionIndex} className="border rounded-lg p-4 bg-slate-50">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg text-slate-900">{section.title}</h3>
                        <p className="text-sm text-slate-600">{section.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => enableAllInSection(section)}
                          className="text-xs"
                        >
                          Enable All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => disableAllInSection(section)}
                          className="text-xs"
                        >
                          Disable All
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3 bg-white rounded-md p-3">
                      {section.features.map((feature) => (
                        <div
                          key={feature.key}
                          className="flex items-start justify-between py-2 border-b last:border-0"
                        >
                          <div className="flex-1">
                            <Label
                              htmlFor={feature.key}
                              className="font-medium text-slate-900 cursor-pointer"
                            >
                              {feature.label}
                            </Label>
                            {feature.description && (
                              <p className="text-xs text-slate-500 mt-1">
                                {feature.description}
                              </p>
                            )}
                          </div>
                          <Switch
                            id={feature.key}
                            checked={featureFlags[feature.key]}
                            onCheckedChange={() => toggleFeature(feature.key)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-white">
                  <Button variant="outline" onClick={() => setFeaturesDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveFeatures} className="bg-blue-600 hover:bg-blue-700">
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
}
