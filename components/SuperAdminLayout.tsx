'use client';

import { useAuth } from '@/context/AuthContext';
import { Button } from './ui/button';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Shield,
  Building2,
  Package,
  Users,
  Activity,
  Settings,
  LogOut,
  Home,
} from 'lucide-react';
import { useEffect } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/super-admin', icon: Home },
  { name: 'Businesses', href: '/super-admin/businesses', icon: Building2 },
  { name: 'Subscriptions', href: '/super-admin/subscriptions', icon: Package },
  { name: 'Users', href: '/super-admin/users', icon: Users },
  { name: 'Activity Log', href: '/super-admin/activity-log', icon: Activity },
  { name: 'Settings', href: '/super-admin/settings', icon: Settings },
];

export function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, signOut, loading: authLoading, isSuperAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!user || !isSuperAdmin)) {
      router.push('/super-admin/login');
    }
  }, [user, authLoading, isSuperAdmin, router]);

  if (authLoading || !user || !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white min-h-screen">
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-6 w-6 text-blue-400" />
              <span className="text-xl font-bold">Super Admin</span>
            </div>
            {userProfile && (
              <div className="text-sm text-slate-400">
                <div className="font-medium text-white">{userProfile.full_name}</div>
                <div className="text-xs">{userProfile.email}</div>
              </div>
            )}
          </div>

          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 w-64 p-4 border-t border-slate-700 space-y-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <Home className="h-5 w-5" />
              Shop Dashboard
            </Link>
            <Button
              variant="ghost"
              className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700"
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
