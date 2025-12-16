'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { ModulePage } from '@/components/ModulePage';

export default function TasksPage() {
  return (
    <DashboardLayout>
      <ModulePage
        title="Tasks & Projects"
        description="Manage tasks, projects, and team collaboration"
      />
    </DashboardLayout>
  );
}
