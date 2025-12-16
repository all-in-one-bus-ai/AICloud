'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Store, ShoppingCart, Users, TrendingUp, Shield } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <nav className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Store className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              CloudPOS
            </span>
          </div>
          <div className="flex gap-3">
            <Link href="/login">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-slate-900 via-blue-800 to-slate-900 bg-clip-text text-transparent">
            Modern Point of Sale for Growing Businesses
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            Complete cloud-based POS system with multi-tenant support, advanced promotions,
            loyalty programs, and scale integration for weight-based items.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="text-lg px-8">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <ShoppingCart className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">POS Sales</h3>
            <p className="text-slate-600">
              Fast and intuitive sales screen with barcode scanning and keyboard shortcuts.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <TrendingUp className="h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Smart Promotions</h3>
            <p className="text-slate-600">
              Group buy, BOGO, and time-based discounts automatically applied at checkout.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <Users className="h-12 w-12 text-purple-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Loyalty Program</h3>
            <p className="text-slate-600">
              Built-in membership cards with coin earning and redemption system.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <Store className="h-12 w-12 text-orange-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Multi-Branch</h3>
            <p className="text-slate-600">
              Manage multiple locations with centralized inventory and reporting.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t bg-white/80 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center gap-4">
            <Link
              href="/super-admin/login"
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <Shield className="h-4 w-4" />
              Platform Administrator Access
            </Link>
            <p className="text-slate-600">&copy; 2025 CloudPOS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
