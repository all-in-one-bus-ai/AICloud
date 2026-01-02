'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase/client';

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface FeatureFlags {
  // Core Features
  feature_suppliers: boolean;
  feature_expenses: boolean;
  feature_staff: boolean;
  feature_attendance: boolean;
  feature_audit_logs: boolean;
  feature_payroll: boolean;

  // Sales Features
  feature_returns: boolean;
  feature_gift_cards: boolean;
  feature_invoices: boolean;
  feature_credit_sales: boolean;

  // Advanced Features
  feature_advanced_reports: boolean;
  feature_auto_reordering: boolean;
  feature_restaurant_mode: boolean;
  feature_ecommerce: boolean;
  feature_api_access: boolean;

  // Inventory Features
  feature_warehouses: boolean;
  feature_manufacturing: boolean;

  // Service Features
  feature_bookings: boolean;
  feature_delivery: boolean;

  // Management Features
  feature_assets: boolean;
  feature_documents: boolean;
  feature_crm: boolean;
  feature_tasks: boolean;

  // Marketing Features
  feature_email_marketing: boolean;
  feature_self_checkout: boolean;
}

interface TenantContextType {
  tenantId: string | null;
  branches: Branch[];
  currentBranch: Branch | null;
  setCurrentBranch: (branch: Branch) => void;
  loading: boolean;
  featureFlags: FeatureFlags | null;
  showDemoProducts: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { userProfile } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags | null>(null);
  const [showDemoProducts, setShowDemoProducts] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile) {
      setTenantId(userProfile.tenant_id);
      fetchBranches(userProfile.tenant_id);
      fetchFeatureFlags(userProfile.tenant_id);
      fetchTenantSettings(userProfile.tenant_id);
    } else {
      setTenantId(null);
      setBranches([]);
      setCurrentBranch(null);
      setFeatureFlags(null);
      setShowDemoProducts(false);
      setLoading(false);
    }
  }, [userProfile]);

  const fetchTenantSettings = async (tenantId: string) => {
    const { data, error } = await supabase
      .from('tenants')
      .select('show_demo_products')
      .eq('id', tenantId)
      .single();

    if (!error && data) {
      setShowDemoProducts(data.show_demo_products || false);
    }
  };

  const fetchBranches = async (tenantId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('branches')
      .select('id, name, code')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      const branchData: Branch[] = data as any;
      setBranches(branchData);
      if (branchData.length > 0 && !currentBranch) {
        const userBranch = branchData.find(b => b.id === userProfile?.branch_id) || branchData[0];
        setCurrentBranch(userBranch);
      }
    }
    setLoading(false);
  };

  const fetchFeatureFlags = async (tenantId: string) => {
    let { data, error } = await (supabase as any)
      .from('tenant_feature_flags')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!error && !data) {
      // Create default feature flags if none exist
      const { data: newFlags, error: insertError } = await (supabase as any)
        .from('tenant_feature_flags')
        .insert({ tenant_id: tenantId })
        .select()
        .single();

      if (!insertError && newFlags) {
        data = newFlags;
      }
    }

    if (data) {
      setFeatureFlags(data as FeatureFlags);
    }
  };

  return (
    <TenantContext.Provider value={{ tenantId, branches, currentBranch, setCurrentBranch, loading, featureFlags, showDemoProducts }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
