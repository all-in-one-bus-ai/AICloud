'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { ModulePage } from '@/components/ModulePage';

export default function APIPage() {
  return (
    <DashboardLayout>
      <ModulePage
        title="API & Webhooks"
        description="Manage API keys and webhook configurations"
      />
    </DashboardLayout>
  );
}
