'use client';

import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { Button } from './ui/button';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Store,
  ShoppingCart,
  Package,
  Users,
  UserCircle,
  Gift,
  BarChart3,
  Settings,
  LogOut,
  Home,
  Clock,
  Shield,
  Truck,
  Receipt,
  RotateCcw,
  CreditCard,
  FileText,
  Repeat,
  UtensilsCrossed,
  Warehouse,
  Calendar,
  Factory,
  MapPin,
  HardDrive,
  FolderOpen,
  Target,
  CheckSquare,
  Mail,
  Monitor,
  Link2,
  ShoppingBag,
  DollarSign,
  Briefcase,
  UserPlus,
  ClipboardList,
  FileBarChart,
  Wallet,
  TrendingUp,
} from 'lucide-react';
import { useEffect } from 'react';

const getNavigationItems = (featureFlags: any) => {
  const items = [
    // Core
    { name: 'Dashboard', href: '/dashboard', icon: Home, show: true },
    { name: 'POS', href: '/pos', icon: ShoppingCart, show: true },

    // Inventory
    { name: 'Products', href: '/dashboard/products', icon: Package, show: true },
    { name: 'Stock', href: '/dashboard/stock', icon: BarChart3, show: true },
    { name: 'Warehouses', href: '/dashboard/warehouses', icon: Warehouse, show: featureFlags?.feature_warehouses },

    // Sales & Customers
    { name: 'Customers', href: '/dashboard/customers', icon: Users, show: true },
    { name: 'Memberships', href: '/dashboard/memberships', icon: UserCircle, show: true },
    { name: 'Returns', href: '/dashboard/returns', icon: RotateCcw, show: featureFlags?.feature_returns },
    { name: 'Invoices', href: '/dashboard/invoices', icon: FileText, show: featureFlags?.feature_invoices },
    { name: 'Gift Cards', href: '/dashboard/gift-cards', icon: CreditCard, show: featureFlags?.feature_gift_cards },

    // Promotions
    { name: 'Group Offers', href: '/dashboard/promotions/group', icon: Gift, show: true },
    { name: 'BOGO Offers', href: '/dashboard/promotions/bogo', icon: Gift, show: true },
    { name: 'Time Discounts', href: '/dashboard/promotions/time', icon: Clock, show: true },

    // Purchasing & Expenses
    { name: 'Suppliers', href: '/dashboard/suppliers', icon: Truck, show: featureFlags?.feature_suppliers },
    { name: 'Purchase Orders', href: '/dashboard/purchases', icon: Receipt, show: featureFlags?.feature_suppliers },
    { name: 'Expenses', href: '/dashboard/expenses', icon: DollarSign, show: featureFlags?.feature_expenses },
    { name: 'Auto Reordering', href: '/dashboard/reordering', icon: Repeat, show: featureFlags?.feature_auto_reordering },

    // AI Features
    { name: 'AI Forecasting', href: '/dashboard/forecasting', icon: TrendingUp, show: true },

    // Staff & Payroll
    { name: 'Staff', href: '/dashboard/staff', icon: UserPlus, show: featureFlags?.feature_staff },
    { name: 'Attendance', href: '/dashboard/attendance', icon: ClipboardList, show: featureFlags?.feature_attendance },
    { name: 'Payroll', href: '/dashboard/payroll', icon: Wallet, show: featureFlags?.feature_payroll },

    // Operations
    { name: 'Restaurant Mode', href: '/dashboard/restaurant', icon: UtensilsCrossed, show: featureFlags?.feature_restaurant_mode },
    { name: 'Deliveries', href: '/dashboard/deliveries', icon: MapPin, show: featureFlags?.feature_delivery },
    { name: 'Bookings', href: '/dashboard/bookings', icon: Calendar, show: featureFlags?.feature_bookings },
    { name: 'Manufacturing', href: '/dashboard/manufacturing', icon: Factory, show: featureFlags?.feature_manufacturing },

    // Management
    { name: 'Assets', href: '/dashboard/assets', icon: HardDrive, show: featureFlags?.feature_assets },
    { name: 'Documents', href: '/dashboard/documents', icon: FolderOpen, show: featureFlags?.feature_documents },
    { name: 'CRM', href: '/dashboard/crm', icon: Target, show: featureFlags?.feature_crm },
    { name: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare, show: featureFlags?.feature_tasks },
    { name: 'Activity Logs', href: '/dashboard/activity-logs', icon: ClipboardList, show: featureFlags?.feature_audit_logs },

    // Marketing
    { name: 'Email Marketing', href: '/dashboard/email-marketing', icon: Mail, show: featureFlags?.feature_email_marketing },

    // Integrations
    { name: 'E-commerce', href: '/dashboard/ecommerce', icon: ShoppingBag, show: featureFlags?.feature_ecommerce },
    { name: 'API & Webhooks', href: '/dashboard/api', icon: Link2, show: featureFlags?.feature_api_access },

    // Reports
    { name: 'Advanced Reports', href: '/dashboard/reports', icon: FileBarChart, show: featureFlags?.feature_advanced_reports },

    // Settings
    { name: 'Settings', href: '/dashboard/settings', icon: Settings, show: true },
  ];

  return items.filter(item => item.show);
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, signOut, loading: authLoading, isSuperAdmin } = useAuth();
  const { currentBranch, featureFlags } = useTenant();
  const pathname = usePathname();
  const router = useRouter();

  const navigation = getNavigationItems(featureFlags);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <aside className="w-64 bg-white border-r min-h-screen">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-4">
              <Store className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold text-slate-900">CloudPOS</span>
            </div>
            {currentBranch && (
              <div className="text-sm text-slate-600">
                <div className="font-medium">{currentBranch.name}</div>
                <div className="text-xs">{userProfile?.full_name}</div>
              </div>
            )}
          </div>

          <nav className="p-4 space-y-1">
            {isSuperAdmin && (
              <Link
                href="/super-admin"
                className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors bg-gradient-to-r from-slate-900 to-slate-700 text-white hover:from-slate-800 hover:to-slate-600 mb-3"
              >
                <Shield className="h-5 w-5" />
                Super Admin
              </Link>
            )}
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 w-64 p-4 border-t">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={signOut}
            >
              <LogOut className="h-5 w-5 mr-2" />
              Sign Out
            </Button>
          </div>
        </aside>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
