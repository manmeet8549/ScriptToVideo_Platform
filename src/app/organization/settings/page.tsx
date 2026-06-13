'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Shield } from 'lucide-react';
import OrgSettingsSection from '@/components/OrgSettingsSection';
import ThinkNextLogo from '@/components/ThinkNextLogo';

export default function OrganizationSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated' && session?.user) {
      const role = session.user.role;
      if (role !== 'ORG_ADMIN' && role !== 'SUPER_ADMIN') {
        router.push('/');
      }
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#fcfcfc] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        <p className="text-xs text-neutral-500 font-sans">Loading preferences...</p>
      </div>
    );
  }

  if (status === 'unauthenticated' || (session?.user?.role !== 'ORG_ADMIN' && session?.user?.role !== 'SUPER_ADMIN')) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-black">
      {/* Top Header Navigation bar */}
      <header className="border-b border-gray-100 bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/">
            <ThinkNextLogo variant="compact" size="xs" />
          </Link>
          <div className="h-5 w-px bg-gray-200" />
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold uppercase tracking-wider">
            <Shield className="h-4 w-4 text-gray-400" />
            <span>Workspace Admin</span>
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-100 bg-white text-gray-500 hover:text-black hover:bg-neutral-50 text-xs font-bold px-4 py-2 transition-all shadow-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
        </Link>
      </header>

      {/* Main Settings Panel */}
      <main className="py-6">
        <OrgSettingsSection />
      </main>
    </div>
  );
}
