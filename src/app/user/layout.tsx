'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { 
  LayoutDashboard, FolderClosed, Copy, Film, FileText, 
  Share2, Settings, LogOut, Bell, Menu, X, Sparkles, Users, Calendar
} from 'lucide-react';
import ThinkNextLogo from '@/components/ThinkNextLogo';
import CreateProjectModal from '@/components/CreateProjectModal';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Credits polling removed

  const navItems = [
    { href: '/user/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/user/projects', label: 'Projects', icon: FolderClosed },
    { href: '/user/templates', label: 'Templates', icon: Copy },
    { href: '/user/video-library', label: 'Video Library', icon: Film },
    { href: '/user/calendar', label: 'Calendar', icon: Calendar },
    { href: '/user/editors', label: 'Editors', icon: Users },
    { href: '/user/assignments', label: 'Assignments', icon: FileText },
    { href: '/user/publish', label: 'Publish', icon: Share2 },
    { href: '/user/settings', label: 'Settings', icon: Settings },
  ];

  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  return (
    <div className="flex min-h-screen bg-[#fcfcfc] text-black flex-col lg:flex-row">
      {/* Left Sidebar (Desktop Only) */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-gray-100 bg-white flex-col justify-between h-screen sticky top-0 p-6 z-20">
        <div className="space-y-8 flex-1 overflow-y-auto pr-1">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <ThinkNextLogo variant="compact" size="xs" />
            <div className="flex flex-col">
              <span className="font-extrabold text-xs tracking-wider uppercase">User Portal</span>
              <span className="text-[9px] text-gray-400 font-medium">Creation Studio</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-neutral-900 text-white shadow-sm' 
                      : 'text-gray-500 hover:text-black hover:bg-neutral-50'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>


        </div>

        {/* User Footer Profile */}
        <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-sm font-bold border border-neutral-800">
              {userInitials}
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-sm text-black truncate block font-sans">{user?.name || 'User'}</span>
              <span className="text-[10px] text-gray-400 font-medium truncate block font-sans">{user?.email}</span>
            </div>
          </div>
          
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50/50"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Mobile Menu Backdrop & Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />
          <aside className="relative flex w-64 max-w-xs flex-col justify-between bg-white p-6 shadow-2xl h-full border-r border-gray-100 z-50">
            <div className="space-y-8 flex-1 overflow-y-auto pr-1">
              <div className="flex items-center justify-between">
                <ThinkNextLogo variant="compact" size="sm" />
                <button onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="h-5 w-5 text-gray-400 hover:text-black" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
                        isActive 
                          ? 'bg-neutral-900 text-white' 
                          : 'text-gray-500 hover:text-black hover:bg-neutral-50'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-xs font-bold">
                  {userInitials}
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-xs text-black truncate block">{user?.name}</span>
                </div>
              </div>
              <button onClick={() => signOut({ callbackUrl: '/' })}>
                <LogOut className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Bar */}
        <header className="lg:hidden sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-gray-100 bg-white/95 backdrop-blur-md px-6 shrink-0">
          <button onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-6 w-6 text-gray-500" />
          </button>
          <ThinkNextLogo variant="compact" size="xs" />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-white text-xs font-bold">
            {userInitials}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto">
          {children}
        </main>
      </div>

      <CreateProjectModal />
    </div>
  );
}
