'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { ModulePage } from '@/components/ModulePage';

export default function ReorderingPage() {
  return (
    <DashboardLayout>
      <ModulePage
        title="Automated Reordering"
        description="Set reorder points and automate purchase order generation"
      />
    </DashboardLayout>
  );
}
