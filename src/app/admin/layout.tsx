'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  BarChart3, Users, Video, FileText, Link2, 
  HardDrive, Coins, History, Download, ArrowLeft
} from 'lucide-react';
import ThinkNextLogo from '@/components/ThinkNextLogo';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/editors', label: 'Editors', icon: Video },
    { href: '/admin/assignments', label: 'Assignments', icon: FileText },
    { href: '/admin/connections', label: 'Connections', icon: Link2 },
    { href: '/admin/storage', label: 'Storage', icon: HardDrive },
    { href: '/admin/credits', label: 'Credits', icon: Coins },
    { href: '/admin/activity', label: 'Activity Log', icon: History },
    { href: '/admin/reports', label: 'Reports Export', icon: Download },
  ];

  return (
    <div className="flex min-h-screen bg-[#fcfcfc] text-black">
      {/* Admin Sidebar */}
      <aside className="w-64 border-r border-gray-100 bg-white flex flex-col justify-between h-screen sticky top-0 p-6 shrink-0 z-20">
        <div className="space-y-8 overflow-y-auto pr-1">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <ThinkNextLogo variant="compact" size="xs" />
            <div className="flex flex-col">
              <span className="font-extrabold text-xs tracking-wider uppercase">Admin Portal</span>
              <span className="text-[9px] text-gray-400 font-medium">Control Center</span>
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

        {/* Back to App button */}
        <div className="pt-4 border-t border-gray-100">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-black transition-colors px-4 py-2 hover:bg-neutral-50 rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
