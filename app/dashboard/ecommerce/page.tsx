'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { ModulePage } from '@/components/ModulePage';

export default function EcommercePage() {
  return (
    <DashboardLayout>
      <ModulePage
        title="E-commerce Integration"
        description="Connect and sync with Shopify, WooCommerce, and other platforms"
      />
    </DashboardLayout>
  );
}
