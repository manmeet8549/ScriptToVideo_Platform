'use client';

import { useAppStore } from '@/store/store';
import { User, Settings, FileText, Key, LifeBuoy, LogOut, Plus, Menu, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';

export default function Navbar() {
  const { activeTab, setActiveTab, setIsCreateModalOpen, setAuthView } = useAppStore();
  const { data: session } = useSession();
  const user = session?.user;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileMenuOpen]);

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
    { icon: FileText, label: 'My Projects', action: () => { setActiveTab('projects'); setIsDropdownOpen(false); setIsMobileMenuOpen(false); } },
    { icon: Settings, label: 'Settings', action: () => { setIsDropdownOpen(false); setIsMobileMenuOpen(false); } },
    { icon: Key, label: 'API Keys', action: () => { setIsDropdownOpen(false); setIsMobileMenuOpen(false); } },
    { icon: LifeBuoy, label: 'Support & Docs', action: () => { setIsDropdownOpen(false); setIsMobileMenuOpen(false); } },
  ];

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    setAuthView(null);
    await signOut({ redirect: false });
  };

  const handleMobileNavClick = (id: any) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Mobile Menu Button & Logo Group */}
        <div className="flex items-center gap-3">
          {/* Hamburger Menu (Mobile Only) */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden flex items-center justify-center h-10 w-10 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            aria-label="Open mobile menu"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Logo */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2 cursor-pointer shrink-0"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-white shadow-md shadow-black/10">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-sans text-lg sm:text-xl font-bold tracking-tight text-black hidden sm:inline-block">ScriptForge AI</span>
          </button>
        </div>

        {/* Navigation (Desktop Only) */}
        <nav className="hidden md:flex gap-8">
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
              
              {/* Mobile quick action (only icon) */}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="sm:hidden flex items-center justify-center rounded-full bg-black text-white h-9 w-9 hover:bg-neutral-800 transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>

              {/* User Dropdown */}
              <div className="relative hidden md:block" ref={dropdownRef}>
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
                className="hidden sm:flex items-center gap-1.5 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 px-5 h-9 transition-colors"
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

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Drawer Sidebar */}
          <div className="relative w-4/5 max-w-sm flex-1 flex flex-col bg-white h-full shadow-xl animate-in slide-in-from-left-full duration-300 z-50">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <span className="font-sans text-xl font-bold tracking-tight text-black">Menu</span>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
              
              <div className="px-3 mb-2 mt-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Navigation</p>
              </div>

              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleMobileNavClick(item.id)}
                  className={`flex items-center px-4 py-3 rounded-xl text-base font-medium transition-colors text-left ${
                    activeTab === item.id 
                    ? 'bg-neutral-100 text-black font-bold' 
                    : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}

              {user && (
                <>
                  <div className="mt-6 px-3 mb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Account</p>
                  </div>
                  
                  <div className="px-4 py-3 mb-2 flex items-center gap-3 bg-neutral-50 rounded-xl mx-2 border border-neutral-100">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white font-semibold">
                      {user?.name ? user.name.substring(0, 2).toUpperCase() : <User className="h-5 w-5" />}
                    </div>
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <span className="text-sm font-bold text-black truncate">{user.name || 'User'}</span>
                      <span className="text-xs text-gray-500 truncate">{user.email}</span>
                    </div>
                  </div>

                  {dropdownItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        onClick={item.action}
                        className="flex w-full items-center gap-3 px-4 py-3 text-base font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-left"
                      >
                        <Icon className="h-5 w-5 text-gray-400" />
                        {item.label}
                      </button>
                    );
                  })}
                  
                  <div className="h-px bg-gray-100 my-2 mx-4" />
                  
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-3 text-base font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-5 w-5 text-red-400" />
                    Log out
                  </button>
                </>
              )}
            </div>
            
            {/* Unauthenticated State Actions */}
            {!user && (
              <div className="p-4 border-t border-gray-100 space-y-3">
                <button
                  onClick={() => { setAuthView('login'); setIsMobileMenuOpen(false); }}
                  className="w-full flex justify-center items-center gap-1.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 py-3 transition-colors"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
