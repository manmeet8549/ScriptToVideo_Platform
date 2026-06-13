'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HeroSection from '@/components/HeroSection';
import AuthScreen from '@/components/AuthScreen';
import ThinkNextLogo from '@/components/ThinkNextLogo';
import { FeaturesSection, HowItWorksSection, TestimonialsSection } from '@/components/GuestMarketing';

import { useAppStore } from '@/store/store';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcfcfc] text-black">
      <div className="flex flex-col items-center gap-6">
        {/* ThinkNEXT Logo */}
        <ThinkNextLogo variant="full" size="md" />
        
        {/* Loading Spinner */}
        <div className="flex items-center gap-3 bg-white border border-gray-100 px-5 py-3 rounded-2xl shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-black" />
          <span className="text-xs font-semibold text-gray-500 tracking-wide font-sans">
            Loading your workspace...
          </span>
        </div>
      </div>
    </div>
  );
}

function GuestLandingPage() {
  const authView = useAppStore((state) => state.authView);

  if (authView !== null) {
    return <AuthScreen />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 bg-[#fcfcfc]">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <TestimonialsSection />
      </main>
      <Footer />
    </div>
  );
}

export default function Home() {
  const { data: session, status } = useSession();
  const authView = useAppStore((state) => state.authView);
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role) {
      const role = session.user.role;
      if (role === 'SUPER_ADMIN' || role === 'ORG_ADMIN' || role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if (role === 'EDITOR') {
        router.push('/editor/dashboard');
      } else {
        router.push('/user/dashboard');
      }
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  if (status === 'authenticated') {
    return <LoadingScreen />;
  }

  return <GuestLandingPage />;
}
