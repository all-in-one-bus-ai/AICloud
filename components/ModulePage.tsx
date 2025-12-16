'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface ModulePageProps {
  title: string;
  description: string;
  children?: React.ReactNode;
  onAddNew?: () => void;
  addNewLabel?: string;
}

export function ModulePage({ title, description, children, onAddNew, addNewLabel = 'Add New' }: ModulePageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-600 mt-1">{description}</p>
        </div>
        {onAddNew && (
          <Button onClick={onAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            {addNewLabel}
          </Button>
        )}
      </div>

      {children || (
        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
            <CardDescription>
              This module is currently under development. Full functionality will be available soon.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              The database structure is ready. UI implementation is in progress.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
