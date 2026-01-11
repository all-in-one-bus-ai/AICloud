'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { SecurityTab } from '@/components/settings/SecurityTab';

export default function SecuritySettingsPage() {
  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Security Settings</h1>
          <p className="text-slate-600 mt-1">Configure security and access control settings</p>
        </div>
        <SecurityTab />
      </div>
    </DashboardLayout>
  );
}
