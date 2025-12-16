'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { ModulePage } from '@/components/ModulePage';

export default function DocumentsPage() {
  return (
    <DashboardLayout>
      <ModulePage
        title="Document Management"
        description="Store and organize business documents"
      />
    </DashboardLayout>
  );
}
