'use client';

import { useAppStore } from '@/store/store';

export default function Footer() {
  const { setActiveTab } = useAppStore();

  return (
    <footer className="w-full border-t border-gray-100 bg-[#fafafa]">
      <div className="mx-auto flex max-w-7xl flex-col-reverse items-center justify-between gap-4 py-8 px-6 sm:flex-row lg:px-8">
        
        {/* Copyright info */}
        <p className="text-xs text-gray-500 font-sans tracking-tight">
          &copy; {new Date().getFullYear()} ScriptForge AI. The Quiet Authority.
        </p>

        {/* Footer links */}
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs font-medium text-gray-500 font-sans">
          <a href="#docs" className="hover:text-black transition-colors">
            Documentation
          </a>
          <a href="#support" className="hover:text-black transition-colors">
            Support
          </a>
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className="hover:text-black transition-colors"
          >
            API Keys
          </button>
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className="hover:text-black transition-colors"
          >
            Settings
          </button>
        </div>

      </div>
    </footer>
  );
}
