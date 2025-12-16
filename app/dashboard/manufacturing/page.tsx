'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { ModulePage } from '@/components/ModulePage';

export default function ManufacturingPage() {
  return (
    <DashboardLayout>
      <ModulePage
        title="Manufacturing & Assembly"
        description="Manage bill of materials and production orders"
      />
    </DashboardLayout>
  );
}
