'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { ModulePage } from '@/components/ModulePage';

export default function DeliveriesPage() {
  return (
    <DashboardLayout>
      <ModulePage
        title="Delivery Management"
        description="Manage delivery zones, drivers, and delivery tracking"
      />
    </DashboardLayout>
  );
}
