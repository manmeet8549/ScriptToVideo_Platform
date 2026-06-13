'use client';

import { useAppStore } from '@/store/store';
import { useSession } from 'next-auth/react';
import ThinkNextLogo from '@/components/ThinkNextLogo';
import Link from 'next/link';

export default function Footer() {
  const { setActiveTab } = useAppStore();
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <footer className="w-full border-t border-gray-100 bg-[#fafafa]">
      <div className="mx-auto flex max-w-7xl flex-col-reverse items-center justify-between gap-4 py-8 px-6 sm:flex-row lg:px-8">
        
        {/* Copyright info + Logo */}
        <div className="flex items-center gap-3">
          <ThinkNextLogo variant="compact" size="xs" />
          <p className="text-xs text-gray-500 font-sans tracking-tight">
            &copy; {new Date().getFullYear()} ThinkNEXT Technologies. All rights reserved.
          </p>
        </div>

        {/* Footer links */}
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs font-medium text-gray-500 font-sans font-sans">
          <Link href="/about" className="hover:text-black transition-colors">
            About
          </Link>
          <Link href="/features" className="hover:text-black transition-colors">
            Features
          </Link>
          <Link href="/contact" className="hover:text-black transition-colors">
            Contact
          </Link>
          {user && (
            <>
              <button 
                onClick={() => setActiveTab('api-keys')} 
                className="hover:text-black transition-colors"
              >
                API Keys
              </button>
              <button 
                onClick={() => setActiveTab('settings')} 
                className="hover:text-black transition-colors"
              >
                Settings
              </button>
            </>
          )}
        </div>

      </div>
    </footer>
  );
}
