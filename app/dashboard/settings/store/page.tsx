'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { StoreInfoTab } from '@/components/settings/StoreInfoTab';

export default function StoreSettingsPage() {
  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Store Information</h1>
          <p className="text-slate-600 mt-1">Manage your store details and business information</p>
        </div>
        <StoreInfoTab />
      </div>
    </DashboardLayout>
  );
}
