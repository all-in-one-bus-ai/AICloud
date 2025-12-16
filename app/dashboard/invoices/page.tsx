'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { ModulePage } from '@/components/ModulePage';

export default function InvoicesPage() {
  return (
    <DashboardLayout>
      <ModulePage
        title="Invoices & Credit Sales"
        description="Create invoices and manage credit sales"
      />
    </DashboardLayout>
  );
}
