'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { ModulePage } from '@/components/ModulePage';

export default function WarehousesPage() {
  return (
    <DashboardLayout>
      <ModulePage
        title="Multi-Warehouse Management"
        description="Manage multiple warehouse locations and stock transfers"
      />
    </DashboardLayout>
  );
}
