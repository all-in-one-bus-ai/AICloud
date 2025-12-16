'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { ModulePage } from '@/components/ModulePage';

export default function RestaurantPage() {
  return (
    <DashboardLayout>
      <ModulePage
        title="Restaurant Mode"
        description="Manage tables, orders, and restaurant operations"
      />
    </DashboardLayout>
  );
}
