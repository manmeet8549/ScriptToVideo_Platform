'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HeroSection from '@/components/HeroSection';
import ActionCards from '@/components/ActionCards';
import ProjectsList from '@/components/ProjectsList';
import TemplatesList from '@/components/TemplatesList';
import ApiKeysSection from '@/components/ApiKeysSection';
import SettingsSection from '@/components/SettingsSection';
import ProjectPipeline from '@/components/ProjectPipeline';
import CreateProjectModal from '@/components/CreateProjectModal';
import AuthScreen from '@/components/AuthScreen';
import VideoLibrary from '@/components/VideoLibrary';
import PublishSection from '@/components/PublishSection';
import ThinkNextLogo from '@/components/ThinkNextLogo';
import EditorsSection from '@/components/EditorsSection';
import EditorDashboard from '@/components/EditorDashboard';
import EditorProfileSection from '@/components/EditorProfileSection';
import AssignmentsSection from '@/components/AssignmentsSection';

import { useAppStore } from '@/store/store';
import { useProjects } from '@/hooks/useProjects';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';

import { 
  LayoutDashboard, FolderClosed, Copy, KeyRound, Settings, 
  LogOut, Plus, ArrowRight, Video, FileText, Volume2, Share2,
  Shield, Users, User, Coins, Bell
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function Home() {
  const { 
    activeTab, setActiveTab, 
    selectedProjectId, setSelectedProjectId,
    activeStepIndex, setActiveStepIndex,
    authView, setAuthView,
    setIsCreateModalOpen, openProject 
  } = useAppStore();
  const { data: session, status } = useSession();
  const user = session?.user;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Credit and Notifications states
  const [credits, setCredits] = useState<{
    scriptCredits: number;
    voiceCredits: number;
    videoCredits: number;
    publishCredits: number;
    storageLimitGB: number;
    storageUsedGB: number;
  } | null>(null);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
  }>>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const fetchCredits = async () => {
    try {
      const res = await fetch('/api/user/credits');
      const data = await res.json();
      if (res.ok) setCredits(data.wallet);
    } catch (err) {
      console.error('Failed to fetch credits', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (res.ok) setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && user) {
      fetchCredits();
      fetchNotifications();
      
      // Refresh every 30s to keep in sync
      const interval = setInterval(() => {
        fetchCredits();
        fetchNotifications();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [status, user]);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/read', { method: 'POST' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // ─── Browser History & URL Syncing ──────────────────────────────────────────
  const isUrlUpdatingStateRef = useRef(false);
  const isInitializedRef = useRef(false);

  // 1. Sync from URL to Zustand store on Mount
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const projectParam = params.get('project');
    const stepParam = params.get('step') ? parseInt(params.get('step') || '') : null;
    const authParam = params.get('auth');

    isUrlUpdatingStateRef.current = true;

    // Default or parsed tab
    const validTabs = ['dashboard', 'projects', 'templates', 'api-keys', 'settings', 'pipeline', 'video-library', 'publish', 'editors', 'connected-users', 'editor-profile', 'assignments'] as const;
    type TabType = typeof validTabs[number];
    if (tabParam && (validTabs as readonly string[]).includes(tabParam)) {
      setActiveTab(tabParam as TabType);
    } else {
      setActiveTab('dashboard');
    }

    // Project and step parameters
    setSelectedProjectId(projectParam || null);
    if (stepParam && stepParam >= 1 && stepParam <= 5) {
      setActiveStepIndex(stepParam);
    } else {
      setActiveStepIndex(null);
    }

    // Auth screen parameters
    setAuthView(authParam === 'login' || authParam === 'signup' ? authParam : null);

    // Initial state rewrite in history
    const initialParams = new URLSearchParams();
    initialParams.set('tab', tabParam || 'dashboard');
    if (projectParam) initialParams.set('project', projectParam);
    if (stepParam) initialParams.set('step', String(stepParam));
    if (authParam) initialParams.set('auth', authParam);

    window.history.replaceState(
      {
        activeTab: tabParam || 'dashboard',
        selectedProjectId: projectParam || null,
        activeStepIndex: stepParam || null,
        authView: authParam || null,
      },
      '',
      window.location.pathname + (initialParams.toString() ? `?${initialParams.toString()}` : '')
    );

    setTimeout(() => {
      isUrlUpdatingStateRef.current = false;
    }, 50);
  }, [setActiveTab, setSelectedProjectId, setActiveStepIndex, setAuthView]);

  // 2. Sync from Zustand state changes to browser URL/History
  useEffect(() => {
    if (isUrlUpdatingStateRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const currentTab = params.get('tab');
    const currentProject = params.get('project');
    const currentStep = params.get('step') ? parseInt(params.get('step') || '') : null;
    const currentAuth = params.get('auth');

    // Mismatches
    const tabMismatch = currentTab !== activeTab;
    const projectMismatch = currentProject !== selectedProjectId;
    const stepMismatch = currentStep !== activeStepIndex;
    const authMismatch = currentAuth !== authView;

    if (tabMismatch || projectMismatch || stepMismatch || authMismatch) {
      const newParams = new URLSearchParams();
      if (activeTab) newParams.set('tab', activeTab);
      if (selectedProjectId) newParams.set('project', selectedProjectId);
      if (activeStepIndex !== null && activeStepIndex !== undefined) {
        newParams.set('step', String(activeStepIndex));
      }
      if (authView) newParams.set('auth', authView);

      const newSearch = newParams.toString() ? `?${newParams.toString()}` : '';

      window.history.pushState(
        {
          activeTab,
          selectedProjectId,
          activeStepIndex,
          authView,
        },
        '',
        window.location.pathname + newSearch
      );
    }
  }, [activeTab, selectedProjectId, activeStepIndex, authView]);

  // 3. Handle Popstate (browser Back/Forward buttons)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      isUrlUpdatingStateRef.current = true;

      const state = event.state;
      if (state) {
        setActiveTab(state.activeTab || 'dashboard');
        setSelectedProjectId(state.selectedProjectId || null);
        setActiveStepIndex(state.activeStepIndex || null);
        setAuthView(state.authView || null);
      } else {
        // Fallback: parse URL
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        const projectParam = params.get('project');
        const stepParam = params.get('step') ? parseInt(params.get('step') || '') : null;
        const authParam = params.get('auth');

        const validTabs = ['dashboard', 'projects', 'templates', 'api-keys', 'settings', 'pipeline', 'video-library', 'publish', 'editors', 'connected-users', 'editor-profile', 'assignments'] as const;
        type TabType = typeof validTabs[number];
        if (tabParam && (validTabs as readonly string[]).includes(tabParam)) {
          setActiveTab(tabParam as TabType);
        } else {
          setActiveTab('dashboard');
        }
        setSelectedProjectId(projectParam || null);
        if (stepParam && stepParam >= 1 && stepParam <= 5) {
          setActiveStepIndex(stepParam);
        } else {
          setActiveStepIndex(null);
        }
        setAuthView(authParam === 'login' || authParam === 'signup' ? authParam : null);
      }

      setTimeout(() => {
        isUrlUpdatingStateRef.current = false;
      }, 50);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setActiveTab, setSelectedProjectId, setActiveStepIndex, setAuthView]);

  // Sync tab for user role
  useEffect(() => {
    if (status === 'authenticated' && user) {
      if (user.role === 'EDITOR') {
        if (activeTab !== 'connected-users' && activeTab !== 'editor-profile' && activeTab !== 'settings') {
          setActiveTab('connected-users');
        }
      } else {
        if (activeTab === 'connected-users' || activeTab === 'editor-profile') {
          setActiveTab('dashboard');
        }
      }
    }
  }, [status, user, activeTab, setActiveTab]);

  // Fetch projects for dashboard list
  const { data: projects = [], isLoading: isProjectsLoading } = useProjects();

  if (status === 'loading') {
    // Skeleton that matches the real layout — no blank screen
    return (
      <div className="flex min-h-screen bg-[#fcfcfc]">
        {/* Sidebar skeleton - desktop only */}
        <aside className="hidden lg:flex w-64 shrink-0 border-r border-gray-100 bg-white flex-col justify-between h-screen sticky top-0 p-6">
          <div className="space-y-8">
            {/* Logo placeholder */}
            <div className="flex flex-col gap-2">
              <div className="h-6 w-32 rounded bg-gray-100 animate-pulse" />
              <div className="h-3.5 w-28 rounded bg-gray-100 animate-pulse" />
              <div className="h-3 w-36 rounded bg-gray-100 animate-pulse" />
            </div>
            {/* Nav item placeholders */}
            <div className="space-y-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="h-10 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          </div>
          {/* User row placeholder */}
          <div className="pt-6 border-t border-gray-100 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-100 animate-pulse shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
              <div className="h-2.5 w-32 rounded bg-gray-100 animate-pulse" />
            </div>
          </div>
        </aside>
        
        {/* Main content pane with header skeleton */}
        <div className="flex-grow flex flex-col min-h-screen w-full min-w-0">
          {/* Mobile Header skeleton */}
          <header className="lg:hidden sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-gray-100 bg-white px-6 shrink-0">
            <div className="h-6 w-6 rounded bg-gray-100 animate-pulse" />
            <div className="h-8 w-24 rounded bg-gray-100 animate-pulse" />
            <div className="h-8 w-8 rounded-full bg-gray-100 animate-pulse" />
          </header>

          <main className="flex-grow p-4 sm:p-6 lg:p-10 space-y-10 overflow-x-hidden">
            {/* Header */}
            <div className="space-y-4">
              <div className="h-3 w-24 rounded-full bg-gray-100 animate-pulse" />
              <div className="h-9 w-64 rounded bg-gray-100 animate-pulse" />
              <div className="h-4 w-96 rounded bg-gray-100 animate-pulse" />
              <div className="flex gap-3 pt-1">
                <div className="h-10 w-40 rounded-full bg-gray-100 animate-pulse" />
                <div className="h-10 w-36 rounded-full bg-gray-100 animate-pulse" />
              </div>
            </div>
            {/* Cards grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 h-56 rounded-3xl bg-gray-100 animate-pulse" />
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-56 rounded-3xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            </div>
            {/* Recent projects row */}
            <div className="space-y-4">
              <div className="h-5 w-40 rounded bg-gray-100 animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-44 rounded-3xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (authView !== null) {
    return <AuthScreen />;
  }

  // ─── AUTHENTICATED SIDEBAR LAYOUT ──────────────────────────────────────────
  if (status === 'authenticated' && user) {
    const sidebarItems = user.role === 'EDITOR'
      ? [
          { id: 'connected-users' as const, label: 'Connected Users', icon: Users },
          { id: 'editor-profile' as const, label: 'My Profile', icon: User },
          { id: 'settings' as const, label: 'Settings', icon: Settings },
        ]
      : [
          { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
          { id: 'projects' as const, label: 'Projects', icon: FolderClosed },
          { id: 'templates' as const, label: 'Templates', icon: Copy },
          { id: 'video-library' as const, label: 'Video Library', icon: Video },
          { id: 'assignments' as const, label: 'Assignments', icon: FileText },
          { id: 'publish' as const, label: 'Publish', icon: Share2 },
          { id: 'api-keys' as const, label: 'API Keys', icon: KeyRound },
          { id: 'editors' as const, label: 'Editors', icon: Users },
          { id: 'settings' as const, label: 'Settings', icon: Settings },
        ];

    const userInitials = user.name
      ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : 'U';

    // Get 3 actual projects for the dashboard, padding with default/draft states to match figma's 4 columns
    const dashboardProjects = projects.slice(0, 3);

    return (
      <div className="flex min-h-screen bg-[#fcfcfc] text-black flex-col lg:flex-row">
        {/* Left Sidebar (Desktop Only) */}
        <aside className="hidden lg:flex w-64 shrink-0 border-r border-gray-100 bg-white flex-col justify-between h-screen sticky top-0 p-6">
          <div className="space-y-8">
            {/* Logo */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className="hover:opacity-85 transition-opacity text-left cursor-pointer"
            >
              <ThinkNextLogo variant="full" size="sm" />
            </button>

            {/* Nav Menu */}
            <nav className="space-y-1.5">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold rounded-2xl transition-all duration-200 text-left ${
                      isActive 
                        ? 'bg-neutral-100 text-black shadow-sm shadow-black/5' 
                        : 'text-gray-500 hover:text-black hover:bg-neutral-50'
                    }`}
                  >
                    <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-black' : 'text-gray-400'}`} />
                    {item.label}
                  </button>
                );
              })}
              {user.role === 'ADMIN' && (
                <Link
                  href="/admin/users"
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold rounded-2xl transition-all duration-200 text-left text-gray-500 hover:text-black hover:bg-neutral-50"
                >
                  <Shield className="h-4.5 w-4.5 text-gray-400" />
                  Admin Panel
                </Link>
              )}
            </nav>

            {user.role === 'USER' && (
              <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-2xl space-y-3 mt-6">
                <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <span>My Credits</span>
                  <Coins className="h-3.5 w-3.5 text-black" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                  <div className="bg-white p-2 rounded-lg border border-neutral-100 flex flex-col">
                    <span className="text-gray-400">Scripts</span>
                    <span className="text-sm font-black text-black">{credits?.scriptCredits ?? 0}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-neutral-100 flex flex-col">
                    <span className="text-gray-400">Voices</span>
                    <span className="text-sm font-black text-black">{credits?.voiceCredits ?? 0}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-neutral-100 flex flex-col">
                    <span className="text-gray-400">Videos</span>
                    <span className="text-sm font-black text-black">{credits?.videoCredits ?? 0}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-neutral-100 flex flex-col">
                    <span className="text-gray-400">Publish</span>
                    <span className="text-sm font-black text-black">{credits?.publishCredits ?? 0}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-neutral-100 space-y-1">
                  <div className="flex justify-between text-[9px] text-gray-400 font-bold">
                    <span>Storage Used</span>
                    <span>{credits?.storageUsedGB?.toFixed(2) ?? '0.00'} / {credits?.storageLimitGB ?? 10} GB</span>
                  </div>
                  <div className="bg-gray-200 h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-black h-full rounded-full transition-all duration-350" 
                      style={{ width: `${Math.min(100, Math.round(((credits?.storageUsedGB ?? 0) / (credits?.storageLimitGB ?? 10)) * 100))}%` }} 
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Account / Profile */}
          <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-sm font-bold border border-neutral-800">
                {userInitials}
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-sm text-black truncate block font-sans">{user.name || 'Workspace User'}</span>
                <span className="text-[10px] text-gray-400 font-medium truncate block font-sans">{user.email}</span>
              </div>
            </div>
            
            <button
              onClick={() => { setAuthView(null); signOut({ redirect: false }); }}
              className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50/50"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </aside>

        {/* Mobile Navigation Drawer & Backdrop */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              />

              {/* Drawer Container */}
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative flex w-64 max-w-xs flex-col justify-between bg-white p-6 shadow-2xl h-full border-r border-gray-100 z-50"
              >
                <div className="space-y-8">
                  {/* Header & Logo */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        setActiveTab('dashboard');
                        setIsMobileMenuOpen(false);
                      }}
                      className="hover:opacity-85 transition-opacity text-left cursor-pointer"
                    >
                      <ThinkNextLogo variant="compact" size="sm" />
                    </button>

                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="text-gray-400 hover:text-black p-1 transition-colors"
                      aria-label="Close menu"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Nav links */}
                  <nav className="space-y-1">
                    {sidebarItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold rounded-2xl transition-all duration-200 text-left ${
                            isActive 
                              ? 'bg-neutral-100 text-black shadow-sm' 
                              : 'text-gray-500 hover:text-black hover:bg-neutral-50'
                          }`}
                        >
                          <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-black' : 'text-gray-400'}`} />
                          {item.label}
                        </button>
                      );
                    })}
                    {user.role === 'ADMIN' && (
                      <Link
                        href="/admin/users"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold rounded-2xl transition-all duration-200 text-left text-gray-500 hover:text-black hover:bg-neutral-50"
                      >
                        <Shield className="h-4.5 w-4.5 text-gray-400" />
                        Admin Panel
                      </Link>
                    )}
                  </nav>
                </div>

                {/* Footer User Row */}
                <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-xs font-bold border border-neutral-800">
                      {userInitials}
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-xs text-black truncate block font-sans">{user.name || 'Workspace User'}</span>
                      <span className="text-[9px] text-gray-400 font-medium truncate block font-sans">{user.email}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => { setAuthView(null); signOut({ redirect: false }); }}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50/50"
                    title="Log out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* Content Pane Wrapper */}
        <div className="flex-grow flex flex-col min-h-screen w-full min-w-0">
          {/* Mobile Header (Only visible on screens < 1024px) */}
          <header className="lg:hidden sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-gray-100 bg-white/95 backdrop-blur-md px-6 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="text-gray-500 hover:text-black transition-colors p-1"
                aria-label="Open menu"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
              {/* Logo */}
              <button
                onClick={() => setActiveTab('dashboard')}
                className="hover:opacity-85 transition-opacity text-left cursor-pointer"
              >
                <ThinkNextLogo variant="compact" size="xs" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white hover:bg-neutral-800 transition-colors"
                title="New Project"
              >
                <Plus className="h-4 w-4" />
              </button>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-white text-xs font-bold border border-neutral-800">
                {userInitials}
              </div>
            </div>
          </header>

          {/* Right Main Panel */}
          <main className="flex-grow p-4 sm:p-6 lg:p-10 flex flex-col justify-between overflow-x-hidden">
            {/* Top Bar with Notifications and Title */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 shrink-0">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                {activeTab === 'dashboard' ? 'Overview' : activeTab.replace('-', ' ')}
              </h2>
              <div className="flex items-center gap-4 relative">
                {/* Notifications Bell */}
                <div className="relative">
                  <button 
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    className="p-2 text-gray-400 hover:text-black hover:bg-neutral-50 rounded-xl transition-all relative border border-gray-100 bg-white"
                  >
                    <Bell className="h-4.5 w-4.5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    )}
                  </button>
                  
                  {isNotifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 p-4 space-y-3 text-left">
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="font-bold text-xs">Notifications</span>
                        {unreadCount > 0 && (
                          <button 
                            onClick={handleMarkAllRead}
                            className="text-[10px] font-bold text-neutral-500 hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                        {notifications.length === 0 ? (
                          <p className="text-[10px] text-gray-400 italic py-4 text-center">No notifications yet.</p>
                        ) : (
                          notifications.map((n) => (
                            <div 
                              key={n.id} 
                              className={`p-2.5 rounded-xl border text-[10px] leading-relaxed transition-all ${
                                n.read 
                                  ? 'bg-white border-gray-50 text-gray-400' 
                                  : 'bg-neutral-50 border-neutral-100 text-black font-medium'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <p className="font-bold">{n.title}</p>
                                {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0 mt-1" />}
                              </div>
                              <p className="text-[9px] mt-0.5">{n.message}</p>
                              <p className="text-[8px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Credits summary (desktop top widget) */}
                {user.role === 'USER' && (
                  <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2">
                    <Coins className="h-3.5 w-3.5 text-black" />
                    <span>Credits: {credits?.videoCredits ?? 0} Video | {credits?.scriptCredits ?? 0} Script</span>
                  </div>
                )}
              </div>
            </div>

            <AnimatePresence mode="wait">
            {/* 1. Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-12"
              >
                {/* Header Welcome banner */}
                <div className="space-y-5">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Ready to Create
                  </div>
                  
                  <div className="space-y-2">
                    <h1 className="text-4xl font-extrabold font-sans tracking-tight text-black">
                      Welcome back, {user.name ? user.name.split(' ')[0] : 'Alex'}
                    </h1>
                    <p className="text-base text-gray-500 font-sans max-w-xl leading-relaxed">
                      Turn ideas into scripts, voiceovers, and AI-generated videos in minutes.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-full bg-black text-white hover:bg-neutral-800 text-sm font-semibold px-6 py-3 transition-all duration-300 shadow-sm"
                    >
                      Create New Project
                    </button>
                    <button
                      onClick={() => setActiveTab('templates')}
                      className="inline-flex items-center gap-2 rounded-full bg-neutral-100 text-black hover:bg-neutral-200 text-sm font-semibold px-6 py-3 transition-all duration-300"
                    >
                      Browse Templates
                    </button>
                  </div>
                </div>

                {/* Grid pillars / Pipeline Explanation */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column: How it Works timeline */}
                  <div className="lg:col-span-4">
                    <Card className="rounded-3xl border border-gray-100 bg-white p-8 h-full shadow-sm">
                      <CardContent className="p-0 space-y-6">
                        <h3 className="font-bold text-lg text-black font-sans leading-tight">
                          How ScriptForge Works
                        </h3>
                        
                        {/* Timeline */}
                        <div className="relative pl-6 border-l border-gray-100 space-y-6">
                          {/* Step 1 */}
                          <div className="relative">
                            <div className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black text-white border-2 border-white">
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                            </div>
                            <span className="font-bold text-xs text-black font-sans block leading-none">Idea</span>
                            <span className="text-xs text-gray-400 font-medium block mt-1 font-sans">Input prompt</span>
                          </div>
                          
                          {/* Step 2 */}
                          <div className="relative">
                            <div className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black text-white border-2 border-white">
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                            </div>
                            <span className="font-bold text-xs text-black font-sans block leading-none">Script</span>
                            <span className="text-xs text-gray-400 font-medium block mt-1 font-sans">AI generation</span>
                          </div>
                          
                          {/* Step 3 */}
                          <div className="relative">
                            <div className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black text-white border-2 border-white">
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                            </div>
                            <span className="font-bold text-xs text-black font-sans block leading-none">Voice</span>
                            <span className="text-xs text-gray-400 font-medium block mt-1 font-sans">Text to speech</span>
                          </div>

                          {/* Step 4 */}
                          <div className="relative">
                            <div className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black text-white border-2 border-white">
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                            </div>
                            <span className="font-bold text-xs text-black font-sans block leading-none">Video</span>
                            <span className="text-xs text-gray-400 font-medium block mt-1 font-sans">Final render</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column: Generate Action Cards */}
                  <div className="lg:col-span-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                      {/* Card 1: Script */}
                      <Card 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between"
                      >
                        <CardContent className="p-0 flex flex-col justify-between h-full space-y-6">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-50 border border-gray-100 text-gray-500">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="space-y-1.5">
                            <h4 className="font-bold text-base text-black font-sans leading-snug">Generate Script</h4>
                            <p className="text-xs text-gray-400 font-sans leading-relaxed">
                              Create compelling narratives from simple text prompts.
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-black pt-1">
                            Start Script
                            <ArrowRight className="h-3 w-3" />
                          </span>
                        </CardContent>
                      </Card>

                      {/* Card 2: Voice */}
                      <Card 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between"
                      >
                        <CardContent className="p-0 flex flex-col justify-between h-full space-y-6">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-50 border border-gray-100 text-gray-500">
                            <Volume2 className="h-5 w-5" />
                          </div>
                          <div className="space-y-1.5">
                            <h4 className="font-bold text-base text-black font-sans leading-snug">Generate Voice</h4>
                            <p className="text-xs text-gray-400 font-sans leading-relaxed">
                              Convert scripts into lifelike voiceovers using premium AI models.
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-black pt-1">
                            Start Voice
                            <ArrowRight className="h-3 w-3" />
                          </span>
                        </CardContent>
                      </Card>

                      {/* Card 3: Video */}
                      <Card 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between"
                      >
                        <CardContent className="p-0 flex flex-col justify-between h-full space-y-6">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-50 border border-gray-100 text-gray-500">
                            <Video className="h-5 w-5" />
                          </div>
                          <div className="space-y-1.5">
                            <h4 className="font-bold text-base text-black font-sans leading-snug">Generate Video</h4>
                            <p className="text-xs text-gray-400 font-sans leading-relaxed">
                              Combine assets into a final, high-quality video production.
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-black pt-1">
                            Start Video
                            <ArrowRight className="h-3 w-3" />
                          </span>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>

                {/* Recent Projects Row matching mockup */}
                <div className="space-y-5">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-xl text-black font-sans leading-tight">
                      Recent Projects
                    </h3>
                    <button 
                      onClick={() => setActiveTab('projects')}
                      className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-black transition-colors"
                    >
                      View all
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {isProjectsLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {[1, 2, 3, 4].map(n => (
                        <Card key={n} className="rounded-3xl border border-gray-100 bg-white p-6 h-40 animate-pulse flex flex-col justify-between">
                          <div className="h-10 w-10 rounded-xl bg-gray-100" />
                          <div className="space-y-2">
                            <div className="h-3.5 w-24 bg-gray-100 rounded" />
                            <div className="h-2.5 w-16 bg-gray-100 rounded" />
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Top 3 Actual Projects */}
                      {dashboardProjects.map((project) => {
                        let Icon = FileText;
                        let bgPill = 'bg-gray-50 text-gray-600 border-gray-100';
                        let label = 'Draft';
                        
                        if (project.status === 'COMPLETED') {
                          Icon = Video;
                          bgPill = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                          label = 'Video Ready';
                        } else if (project.step === 'VOICE') {
                          Icon = Volume2;
                          bgPill = 'bg-blue-50 text-blue-700 border-blue-100';
                          label = 'Voice Ready';
                        } else if (project.step === 'SCRIPT') {
                          Icon = FileText;
                          bgPill = 'bg-gray-50 text-gray-700 border-gray-200';
                          label = 'Script Ready';
                        }

                        return (
                          <Card 
                            key={project.id}
                            onClick={() => openProject(project.id)}
                            className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between h-44"
                          >
                            <CardContent className="p-0 flex flex-col justify-between h-full space-y-4">
                              <div className="flex h-12 w-full justify-center items-center rounded-2xl bg-neutral-100 text-gray-400 font-bold border border-neutral-50/50">
                                <Icon className="h-6 w-6 text-gray-400" />
                              </div>
                              <div className="space-y-2">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${bgPill}`}>
                                  {label}
                                </span>
                                <h4 className="font-bold text-xs text-black truncate block font-sans leading-none">{project.name}</h4>
                                <span className="text-[10px] text-gray-400 font-medium font-sans block">
                                  Updated {new Date(project.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      {/* Fallback mock cards or "Create Project" plus card to fill the 4 slots */}
                      {Array.from({ length: 4 - dashboardProjects.length }).map((_, idx) => (
                        <Card 
                          key={idx}
                          onClick={() => setIsCreateModalOpen(true)}
                          className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between h-44 border-dashed bg-gray-50/20 hover:bg-gray-50/50"
                        >
                          <CardContent className="p-0 flex flex-col justify-between h-full space-y-4">
                            <div className="flex h-12 w-full justify-center items-center rounded-2xl bg-neutral-50 border border-dashed border-neutral-200 text-gray-300 font-bold">
                              <Plus className="h-6 w-6" />
                            </div>
                            <div className="space-y-2">
                              <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-400">
                                Draft
                              </span>
                              <h4 className="font-bold text-xs text-gray-400 font-sans leading-none">New Project</h4>
                              <span className="text-[10px] text-gray-300 font-medium font-sans block">Create new pipeline</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 2. Projects Tab */}
            {activeTab === 'projects' && (
              <motion.div
                key="projects"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <ProjectsList />
              </motion.div>
            )}

            {/* 2b. Pipeline Tab — project detail with generation steps */}
            {activeTab === 'pipeline' && (
              <motion.div
                key="pipeline"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <ProjectPipeline />
              </motion.div>
            )}

            {/* 3. Templates Tab */}
            {activeTab === 'templates' && (
              <motion.div
                key="templates"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <TemplatesList />
              </motion.div>
            )}

            {/* 4. API Keys Tab */}
            {activeTab === 'api-keys' && (
              <motion.div
                key="api-keys"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <ApiKeysSection />
              </motion.div>
            )}

            {/* 5. Settings Tab */}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <SettingsSection />
              </motion.div>
            )}

            {/* 6. Video Library Tab */}
            {activeTab === 'video-library' && (
              <motion.div
                key="video-library"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <VideoLibrary />
              </motion.div>
            )}

            {/* 6b. Assignments Tab */}
            {activeTab === 'assignments' && (
              <motion.div
                key="assignments"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <AssignmentsSection />
              </motion.div>
            )}

            {/* 7. Publish Tab */}
            {activeTab === 'publish' && (
              <motion.div
                key="publish"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <PublishSection />
              </motion.div>
            )}

            {/* 8. Editors Tab */}
            {activeTab === 'editors' && (
              <motion.div
                key="editors"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <EditorsSection />
              </motion.div>
            )}

            {/* 9. Connected Users (Editor Dashboard) Tab */}
            {activeTab === 'connected-users' && (
              <motion.div
                key="connected-users"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <EditorDashboard />
              </motion.div>
            )}

            {/* 10. Editor Profile Tab */}
            {activeTab === 'editor-profile' && (
              <motion.div
                key="editor-profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <EditorProfileSection />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Inline footer */}
          <footer className="mt-12 pt-6 border-t border-gray-50 text-[10px] text-gray-400 font-sans flex justify-between">
            <span>© {new Date().getFullYear()} ThinkNEXT. All rights reserved.</span>
            <span>Version 1.0.0 (PostgreSQL Build)</span>
          </footer>
        </main>
        </div> {/* End of Content Pane Wrapper */}

        {/* Global Modals */}
        <CreateProjectModal />
      </div>
    );
  }

  // ─── PUBLIC LANDING PAGE LAYOUT ────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen">
      {/* Global Navigation Header */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 bg-[#fcfcfc]">
        {/* Figma-matched Hero Section */}
        <HeroSection />

        {/* Action Pillars Grid */}
        <ActionCards />

        {/* Projects tracker/history */}
        <ProjectsList />
      </main>

      {/* Global Modals */}
      <CreateProjectModal />

      {/* Footer Info */}
      <Footer />
    </div>
  );
}
