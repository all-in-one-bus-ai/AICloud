'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { ModulePage } from '@/components/ModulePage';

export default function CRMPage() {
  return (
    <DashboardLayout>
      <ModulePage
        title="CRM"
        description="Manage leads, opportunities, and customer relationships"
      />
    </DashboardLayout>
  );
}
