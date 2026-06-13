'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building, Users, HardDrive, BarChart3, ShieldAlert, CheckCircle2, 
  Search, ExternalLink, ShieldCheck, Power, RefreshCw, LogOut, ArrowLeft, Loader2
} from 'lucide-react';
import ThinkNextLogo from '@/components/ThinkNextLogo';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { signOut } from 'next-auth/react';

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  subscriptionPlan: string;
  status: string;
  createdAt: string;
  _count: {
    users: number;
    projects: number;
    videos: number;
  };
  customDomains: Array<{ domain: string; verified: boolean }>;
}

export default function SuperAdminDashboard() {
  const [metrics, setMetrics] = useState({
    organizations: 0,
    users: 0,
    editors: 0,
    videosGenerated: 0,
    videosPublished: 0,
    storageConsumedGB: 0,
    monthlyRevenue: 0
  });

  const [subscriptions, setSubscriptions] = useState<Record<string, number>>({
    FREE: 0,
    STARTER: 0,
    PRO: 0,
    BUSINESS: 0,
    ENTERPRISE: 0
  });

  const [orgs, setOrgs] = useState<OrgDetail[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const analyticsRes = await fetch('/api/super-admin/analytics');
      const analyticsData = await analyticsRes.json();
      if (analyticsRes.ok) {
        setMetrics(analyticsData.metrics);
        setSubscriptions(analyticsData.subscriptions);
      }

      const orgsRes = await fetch('/api/super-admin/organizations');
      const orgsData = await orgsRes.json();
      if (orgsRes.ok) {
        setOrgs(orgsData.organizations || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const handleUpdateOrgStatus = async (orgId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const verb = currentStatus === 'ACTIVE' ? 'suspend' : 'activate';
    
    if (!confirm(`Are you sure you want to ${verb} this organization?`)) return;

    try {
      const res = await fetch('/api/super-admin/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          status: nextStatus
        })
      });

      if (res.ok) {
        setOrgs(prev => prev.map(o => o.id === orgId ? { ...o, status: nextStatus } : o));
        fetchStats(); // reload stats
      } else {
        const body = await res.json();
        alert(body.error || 'Failed to update status.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateOrgPlan = async (orgId: string, newPlan: string) => {
    if (!confirm(`Are you sure you want to change this organization's plan to ${newPlan}?`)) return;

    try {
      const res = await fetch('/api/super-admin/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          subscriptionPlan: newPlan
        })
      });

      if (res.ok) {
        setOrgs(prev => prev.map(o => o.id === orgId ? { ...o, subscriptionPlan: newPlan } : o));
        fetchStats();
      } else {
        const body = await res.json();
        alert(body.error || 'Failed to update plan.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredOrgs = orgs.filter(o => 
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
        <p className="text-xs text-neutral-400 font-mono">Loading Global Console...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#e5e5e5] font-sans flex flex-col justify-between">
      
      {/* Header bar */}
      <header className="border-b border-neutral-800 bg-[#0d0d0d]/85 backdrop-blur-md px-8 py-5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <ThinkNextLogo variant="compact" size="sm" />
          <div className="h-6 w-px bg-neutral-800" />
          <div className="flex flex-col">
            <span className="font-extrabold text-xs tracking-widest uppercase text-white font-mono">SaaS Controller</span>
            <span className="text-[9px] text-neutral-500 font-mono">Platform Admin Access</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="p-2 text-neutral-400 hover:text-white rounded-xl transition-all border border-neutral-800 bg-neutral-900/50"
            title="Refresh statistics"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white text-xs font-bold px-4 py-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to App
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="p-2 text-rose-500 hover:text-rose-400 rounded-xl transition-all border border-neutral-800 bg-neutral-900/50"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Console Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-6 lg:p-8 space-y-8">
        
        {/* Top welcome metadata row */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-white font-mono tracking-tight">Global System Overview</h1>
            <p className="text-xs text-neutral-500 font-mono mt-1">Cross-tenant billing, analytics, and suspension gate controls.</p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/40 border border-emerald-900 px-3 py-1 text-xs font-bold text-emerald-400 font-mono">
            <ShieldCheck className="h-4 w-4" /> Root Authorization Active
          </div>
        </div>

        {/* Global Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-[#141414] border-neutral-800 p-6 space-y-2 rounded-2xl">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block font-mono">Active Organizations</span>
            <div className="flex justify-between items-end">
              <span className="text-3xl font-extrabold text-white font-mono">{metrics.organizations}</span>
              <Building className="h-5 w-5 text-neutral-600 mb-1" />
            </div>
          </Card>

          <Card className="bg-[#141414] border-neutral-800 p-6 space-y-2 rounded-2xl">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block font-mono">Overall Users / Editors</span>
            <div className="flex justify-between items-end">
              <span className="text-3xl font-extrabold text-white font-mono">
                {metrics.users} <span className="text-xs text-neutral-500 font-normal">/ {metrics.editors}</span>
              </span>
              <Users className="h-5 w-5 text-neutral-600 mb-1" />
            </div>
          </Card>

          <Card className="bg-[#141414] border-neutral-800 p-6 space-y-2 rounded-2xl">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block font-mono">Total R2 Storage Used</span>
            <div className="flex justify-between items-end">
              <span className="text-3xl font-extrabold text-white font-mono">{metrics.storageConsumedGB} <span className="text-xs text-neutral-500">GB</span></span>
              <HardDrive className="h-5 w-5 text-neutral-600 mb-1" />
            </div>
          </Card>

          <Card className="bg-[#141414] border-neutral-800 p-6 space-y-2 rounded-2xl">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block font-mono">Simulated Monthly Revenue</span>
            <div className="flex justify-between items-end">
              <span className="text-3xl font-extrabold text-emerald-400 font-mono">${metrics.monthlyRevenue}</span>
              <BarChart3 className="h-5 w-5 text-emerald-600 mb-1" />
            </div>
          </Card>
        </div>

        {/* Subscriptions Distributions & Quick Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Subscriptions Distribution Chart */}
          <div className="lg:col-span-8 bg-[#141414] border border-neutral-800 rounded-3xl p-6 space-y-5">
            <h3 className="text-base font-bold text-white font-mono border-b border-neutral-800 pb-2">Active Plan Distribution</h3>
            <div className="space-y-4">
              {Object.entries(subscriptions).map(([plan, count]) => {
                const total = metrics.organizations || 1;
                const percentage = Math.round((count / total) * 100);
                
                return (
                  <div key={plan} className="space-y-1 text-xs">
                    <div className="flex justify-between text-neutral-400 font-mono">
                      <span>{plan}</span>
                      <span>{count} orgs ({percentage}%)</span>
                    </div>
                    <div className="bg-neutral-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all" 
                        style={{ width: `${percentage}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Root limits info widget */}
          <div className="lg:col-span-4 bg-[#141414] border border-neutral-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white font-mono border-b border-neutral-800 pb-2">Admin Notes</h3>
            <div className="text-xs text-neutral-400 leading-relaxed font-mono space-y-3">
              <p>Suspension status blocks generation and publishing dynamically across all user tokens linked to the tenant organization.</p>
              <p>Custom domains require mapping to the server IP and DNS configuration. Verification can be toggled by the Super Admin console or Mock Domain Verification.</p>
            </div>
          </div>
        </div>

        {/* Organizations Management Console */}
        <div className="bg-[#141414] border border-neutral-800 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-neutral-800 pb-4">
            <h3 className="text-lg font-bold text-white font-mono">Organizations Registry</h3>
            
            {/* Search filter */}
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3.5 py-1.5 text-xs rounded-xl bg-neutral-900 border border-neutral-800 outline-none text-white focus:border-neutral-600 font-mono w-full"
              />
            </div>
          </div>

          {/* Org table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-neutral-500 border-b border-neutral-800">
                  <th className="py-3 px-4">Organization Name</th>
                  <th className="py-3 px-4">Subdomain / Domain</th>
                  <th className="py-3 px-4">Stats</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-neutral-500 italic">No organizations found.</td>
                  </tr>
                ) : (
                  filteredOrgs.map((org) => {
                    const hasCustomDomain = org.customDomains && org.customDomains.length > 0;
                    return (
                      <tr key={org.id} className="border-b border-neutral-800/60 hover:bg-neutral-900/30 transition-colors">
                        <td className="py-4 px-4 font-bold text-white">
                          {org.name}
                          <span className="block text-[9px] text-neutral-500 font-normal">ID: {org.id}</span>
                        </td>
                        <td className="py-4 px-4 text-neutral-400">
                          <span className="block">{org.slug}.localhost:3000</span>
                          {hasCustomDomain && (
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                              <CheckCircle2 className="h-3 w-3" /> {org.customDomains[0].domain}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-neutral-400">
                          <span className="block">{org._count.users} Users</span>
                          <span className="block text-[10px] text-neutral-500">{org._count.projects} Projects • {org._count.videos} Videos</span>
                        </td>
                        <td className="py-4 px-4">
                          <select
                            value={org.subscriptionPlan}
                            onChange={(e) => handleUpdateOrgPlan(org.id, e.target.value)}
                            className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-neutral-600"
                          >
                            <option value="FREE">FREE</option>
                            <option value="STARTER">STARTER</option>
                            <option value="PRO">PRO</option>
                            <option value="BUSINESS">BUSINESS</option>
                            <option value="ENTERPRISE">ENTERPRISE</option>
                          </select>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            org.status === 'ACTIVE' 
                              ? 'bg-emerald-950/40 border border-emerald-900 text-emerald-400' 
                              : 'bg-rose-950/40 border border-rose-900 text-rose-400'
                          }`}>
                            {org.status === 'ACTIVE' ? <CheckCircle2 className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                            {org.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleUpdateOrgStatus(org.id, org.status)}
                            className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                              org.status === 'ACTIVE'
                                ? 'bg-rose-950/20 border-rose-900/50 text-rose-400 hover:bg-rose-900 hover:text-white'
                                : 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400 hover:bg-emerald-900 hover:text-white'
                            }`}
                          >
                            <Power className="h-3 w-3" />
                            {org.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Footer bar */}
      <footer className="border-t border-neutral-850 bg-[#0d0d0d]/40 px-8 py-5 text-center text-xs text-neutral-600 font-mono">
        © 2026 ScriptForge Technologies Inc. Super Admin Control Panel. High security active.
      </footer>
    </div>
  );
}
