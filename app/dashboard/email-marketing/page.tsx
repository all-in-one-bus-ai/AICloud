'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { ModulePage } from '@/components/ModulePage';

export default function EmailMarketingPage() {
  return (
    <DashboardLayout>
      <ModulePage
        title="Email Marketing"
        description="Create and send email campaigns to customers"
      />
    </DashboardLayout>
  );
}
