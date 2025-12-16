'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, ShoppingCart, Users, Package } from 'lucide-react';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-2">Welcome to your POS system</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total Sales Today
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0.00</div>
              <p className="text-xs text-slate-600 mt-1">No sales yet</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Products
              </CardTitle>
              <Package className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-slate-600 mt-1">Add products to start</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Customers
              </CardTitle>
              <Users className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-slate-600 mt-1">No customers yet</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Transactions
              </CardTitle>
              <Store className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-slate-600 mt-1">No transactions</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Start Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                1
              </div>
              <div>
                <p className="font-medium">Add Products</p>
                <p className="text-sm text-slate-600">
                  Go to Products page to add your inventory
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                2
              </div>
              <div>
                <p className="font-medium">Set Up Stock Levels</p>
                <p className="text-sm text-slate-600">
                  Configure stock quantities for your branch
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                3
              </div>
              <div>
                <p className="font-medium">Configure Promotions (Optional)</p>
                <p className="text-sm text-slate-600">
                  Set up group offers, BOGO deals, or time-based discounts
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                4
              </div>
              <div>
                <p className="font-medium">Start Selling</p>
                <p className="text-sm text-slate-600">
                  Go to POS page to start processing sales
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
