'use client';

import { useAppStore } from '@/store/store';
import { User, Settings, FileText, Key, LifeBuoy, LogOut, Plus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';

export default function Navbar() {
  const { activeTab, setActiveTab, setIsCreateModalOpen, setAuthView } = useAppStore();
  const { data: session } = useSession();
  const user = session?.user;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter out projects and templates for unauthenticated guests
  const navItems = user
    ? [
        { id: 'dashboard' as const, label: 'Dashboard' },
        { id: 'projects' as const, label: 'Projects' },
        { id: 'templates' as const, label: 'Templates' },
      ]
    : [
        { id: 'dashboard' as const, label: 'Dashboard' },
      ];

  const dropdownItems = [
    { icon: FileText, label: 'My Projects', action: () => { setActiveTab('projects'); setIsDropdownOpen(false); } },
    { icon: Plus, label: 'New Video Project', action: () => { setIsCreateModalOpen(true); setIsDropdownOpen(false); } },
    { icon: Settings, label: 'Settings', action: () => setIsDropdownOpen(false) },
    { icon: Key, label: 'API Keys', action: () => setIsDropdownOpen(false) },
    { icon: LifeBuoy, label: 'Support & Docs', action: () => setIsDropdownOpen(false) },
  ];

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    setAuthView(null);
    await signOut({ redirect: false });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">

        {/* Logo */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-white shadow-md shadow-black/10">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="font-sans text-xl font-bold tracking-tight text-black">ScriptForge AI</span>
        </button>

        {/* Navigation */}
        <nav className="flex gap-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative py-5 text-sm font-medium transition-colors ${
                activeTab === item.id ? 'text-black' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {item.label}
              {activeTab === item.id && (
                <span className="absolute bottom-0 left-0 h-0.5 w-full bg-black" />
              )}
            </button>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 rounded-full bg-black text-sm font-medium text-white hover:bg-neutral-800 px-4 h-9 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Project
              </button>

              {/* User Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-black text-white hover:bg-neutral-800 font-semibold text-xs transition-colors"
                  aria-label="Open user menu"
                >
                  {user?.name ? user.name.substring(0, 2).toUpperCase() : <User className="h-4 w-4" />}
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-gray-100 bg-white p-1 shadow-lg z-50">
                    <div className="px-3 py-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">My Account</p>
                      <p className="text-xs text-gray-400 font-medium truncate mt-0.5">{user?.email}</p>
                    </div>
                    <div className="h-px bg-gray-100 my-1" />
                    {dropdownItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          onClick={item.action}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-left"
                        >
                          <Icon className="h-4 w-4 text-gray-400" />
                          {item.label}
                        </button>
                      );
                    })}
                    <div className="h-px bg-gray-100 my-1" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4 text-red-400" />
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAuthView('login')}
                className="flex items-center gap-1.5 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 px-5 h-9 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => setAuthView('signup')}
                className="flex items-center gap-1.5 rounded-full bg-black text-sm font-medium text-white hover:bg-neutral-800 px-5 h-9 transition-colors"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
