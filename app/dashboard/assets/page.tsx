'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { ModulePage } from '@/components/ModulePage';

export default function AssetsPage() {
  return (
    <DashboardLayout>
      <ModulePage
        title="Asset Management"
        description="Track business assets, depreciation, and maintenance"
      />
    </DashboardLayout>
  );
}
