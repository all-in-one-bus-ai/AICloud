import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import { TenantProvider } from '@/context/TenantContext';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CloudPOS - Modern Point of Sale System',
  description: 'Complete cloud-based POS with multi-tenant support, promotions, and loyalty',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <TenantProvider>
            {children}
            <Toaster />
          </TenantProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
