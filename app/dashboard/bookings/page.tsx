'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { ModulePage } from '@/components/ModulePage';

export default function BookingsPage() {
  return (
    <DashboardLayout>
      <ModulePage
        title="Bookings & Appointments"
        description="Manage customer bookings and service appointments"
      />
    </DashboardLayout>
  );
}
