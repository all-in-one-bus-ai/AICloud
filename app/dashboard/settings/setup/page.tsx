'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { SetupGuideTab } from '@/components/settings/SetupGuideTab';

export default function SetupGuidePage() {
  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Hardware Setup Guide</h1>
          <p className="text-slate-600 mt-1">Learn how to install and configure the hardware bridge service</p>
        </div>
        <SetupGuideTab />
      </div>
    </DashboardLayout>
  );
}
