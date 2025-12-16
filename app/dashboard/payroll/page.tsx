'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { ModulePage } from '@/components/ModulePage';

export default function PayrollPage() {
  return (
    <DashboardLayout>
      <ModulePage
        title="UK Payroll & HMRC"
        description="Process payroll with automatic HMRC tax, NI, and pension calculations"
      />
    </DashboardLayout>
  );
}
