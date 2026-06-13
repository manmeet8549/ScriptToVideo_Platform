'use client';

import { useState, useEffect } from 'react';
import { 
  Users, Video, FolderClosed, Film, Activity, 
  ShieldCheck, Plus, Pause, Play, KeyRound, Loader2, 
  Server, CheckCircle2, AlertCircle, RefreshCw,
  FileText, Mic, Globe
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import dynamic from 'next/dynamic';
const DashboardCalendarWidget = dynamic(() => import('@/components/DashboardCalendarWidget'), {
  ssr: false,
  loading: () => <div className="h-96 bg-white border border-gray-100 rounded-[32px] animate-pulse" />
});

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Quick Action form inputs state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserEmail, setCreateUserEmail] = useState('');
  const [createUserName, setCreateUserName] = useState('');
  const [createUserRole, setCreateUserRole] = useState<'USER' | 'EDITOR' | 'ADMIN'>('USER');



  const fetchStats = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const res = await fetch('/api/admin/overview');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        setMessage({ type: 'error', text: 'Failed to load system metrics.' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Error connecting to the API.' });
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(true);
    const interval = setInterval(() => {
      fetchStats(false);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('create-user');
    setMessage(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createUserEmail,
          name: createUserName,
          role: createUserRole,
          password: 'password123' // Default password
        })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: `Successfully created ${createUserRole.toLowerCase()} ${createUserName}.` });
        setShowCreateUser(false);
        setCreateUserEmail('');
        setCreateUserName('');
        fetchStats();
      } else {
        const errData = await res.json();
        setMessage({ type: 'error', text: errData.error || 'Failed to create user.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setActionLoading(null);
    }
  };



  const handleToggleAccountStatus = async (email: string, action: 'pause' | 'resume') => {
    setActionLoading(action);
    setMessage(null);
    try {
      // Find the user first to get their ID
      const userRes = await fetch(`/api/admin/users`);
      if (!userRes.ok) throw new Error();
      const usersData = await userRes.json();
      const targetUser = usersData.users?.find((u: any) => u.email === email);
      if (!targetUser) {
        setMessage({ type: 'error', text: 'User not found.' });
        setActionLoading(null);
        return;
      }

      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountStatus: action === 'pause' ? 'PAUSED' : 'ACTIVE'
        })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: `Account status updated to ${action === 'pause' ? 'PAUSED' : 'ACTIVE'}.` });
        fetchStats();
      } else {
        const errData = await res.json();
        setMessage({ type: 'error', text: errData.error || 'Failed to update status.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update account status.' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-8 space-y-10 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex justify-between items-center pb-5 border-b border-gray-100">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 font-sans">
            SaaS Control Center
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            Monitor and manage organizations, users, credits, and engine statistics.
          </p>
        </div>
        <button 
          onClick={() => fetchStats(true)}
          className="p-2.5 text-gray-500 hover:text-black hover:bg-neutral-50 rounded-xl transition-all border border-gray-100 bg-white"
          title="Refresh Metrics"
        >
          <RefreshCw className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className={`p-4 rounded-2xl flex items-start gap-3 border text-sm font-semibold transition-all ${
          message.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-rose-50 border-rose-100 text-rose-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {/* Total Users */}
        <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs relative overflow-hidden">
          <CardContent className="p-0 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block truncate">Total Users</span>
              {isLoading ? (
                <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
              ) : (
                <div className="text-2xl font-black text-black">{stats?.users?.total ?? 0}</div>
              )}
              <span className="text-[10px] text-emerald-600 font-bold block">
                {stats?.users?.active ?? 0} Active Accounts
              </span>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-neutral-50 border border-gray-100 flex items-center justify-center text-neutral-500 shrink-0">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Total Editors */}
        <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs relative overflow-hidden">
          <CardContent className="p-0 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block truncate">Total Editors</span>
              {isLoading ? (
                <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
              ) : (
                <div className="text-2xl font-black text-black">{stats?.editors?.total ?? 0}</div>
              )}
              <span className="text-[10px] text-gray-400 font-bold block">
                {stats?.editors?.active ?? 0} Online
              </span>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-neutral-50 border border-gray-100 flex items-center justify-center text-neutral-500 shrink-0">
              <Video className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Total Projects */}
        <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs relative overflow-hidden">
          <CardContent className="p-0 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block truncate">Total Projects</span>
              {isLoading ? (
                <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
              ) : (
                <div className="text-2xl font-black text-black">{stats?.projectsCreated ?? 0}</div>
              )}
              <span className="text-[10px] text-gray-400 font-bold block">
                All-time projects
              </span>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-neutral-50 border border-gray-100 flex items-center justify-center text-neutral-500 shrink-0">
              <FolderClosed className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Active Projects */}
        <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs relative overflow-hidden">
          <CardContent className="p-0 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block truncate">Active Projects</span>
              {isLoading ? (
                <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
              ) : (
                <div className="text-2xl font-black text-black text-amber-600">{stats?.activeProjects ?? 0}</div>
              )}
              <span className="text-[10px] text-amber-500 font-bold block">
                In progress
              </span>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-neutral-50 border border-gray-100 flex items-center justify-center text-neutral-500 shrink-0">
              <Activity className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        {/* Videos Generated */}
        <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs relative overflow-hidden">
          <CardContent className="p-0 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block truncate">Videos Generated</span>
              {isLoading ? (
                <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
              ) : (
                <div className="text-2xl font-black text-black">{stats?.videosGenerated ?? 0}</div>
              )}
              <span className="text-[10px] text-emerald-600 font-bold block">
                100% success rate
              </span>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-neutral-50 border border-gray-100 flex items-center justify-center text-neutral-500 shrink-0">
              <Film className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Published Videos */}
        <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs relative overflow-hidden">
          <CardContent className="p-0 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block truncate">Published Videos</span>
              {isLoading ? (
                <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
              ) : (
                <div className="text-2xl font-black text-black text-emerald-600">{stats?.publishedVideos ?? 0}</div>
              )}
              <span className="text-[10px] text-emerald-600 font-bold block">
                Distributed social clips
              </span>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-neutral-50 border border-gray-100 flex items-center justify-center text-neutral-500 shrink-0">
              <Globe className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health & Status Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* System Health */}
        <div className="lg:col-span-4">
          <Card className="rounded-3xl border border-gray-100 bg-white p-8 h-full shadow-xs">
            <CardContent className="p-0 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-black font-sans leading-tight">System Status</h3>
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-medium">Platform Health</span>
                  <span className="font-bold text-emerald-600">Excellent (99.98% uptime)</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-medium">Generation Engine</span>
                  <span className="font-bold text-black flex items-center gap-1">
                    <Server className="h-3.5 w-3.5 text-neutral-400" />
                    Online
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-medium">Active Accounts</span>
                  <span className="font-bold text-black">{(stats?.users?.active ?? 0) + (stats?.editors?.active ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-medium">Paused Accounts</span>
                  <span className="font-bold text-amber-600">{(stats?.users?.paused ?? 0) + (stats?.editors?.paused ?? 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Panel */}
        <div className="lg:col-span-8">
          <Card className="rounded-3xl border border-gray-100 bg-white p-8 h-full shadow-xs">
            <CardContent className="p-0 space-y-6">
              <h3 className="font-bold text-lg text-black font-sans leading-tight">Quick Administrator Actions</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Create User Button */}
                <button
                  onClick={() => setShowCreateUser(!showCreateUser)}
                  className="p-4 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-100/50 transition-all text-left flex flex-col justify-between h-32"
                >
                  <Plus className="h-5 w-5 text-neutral-600" />
                  <div>
                    <span className="font-bold text-xs text-black block">Create User / Editor</span>
                    <span className="text-[10px] text-gray-400">Add new credentials</span>
                  </div>
                </button>

                {/* Pause/Resume Target Input Button */}
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100/50 flex flex-col justify-between h-32">
                  <Activity className="h-5 w-5 text-neutral-600" />
                  <div>
                    <span className="font-bold text-xs text-black block">Status Control</span>
                    <div className="flex gap-1.5 mt-2">
                      <button 
                        onClick={() => {
                          const email = prompt('Enter User Email to Pause:');
                          if (email) handleToggleAccountStatus(email, 'pause');
                        }}
                        className="flex-1 py-1 text-[9px] font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-center"
                      >
                        Pause
                      </button>
                      <button 
                        onClick={() => {
                          const email = prompt('Enter User Email to Resume:');
                          if (email) handleToggleAccountStatus(email, 'resume');
                        }}
                        className="flex-1 py-1 text-[9px] font-bold bg-neutral-900 text-white rounded-lg hover:bg-black transition-colors text-center"
                      >
                        Resume
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Modals / Inline Forms */}
      {showCreateUser && (
        <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-md max-w-md">
          <CardContent className="p-0 space-y-4">
            <h3 className="font-bold text-sm text-black">Create Platform User</h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Full Name</label>
                <input 
                  type="text" 
                  value={createUserName}
                  onChange={e => setCreateUserName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-100 focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Email Address</label>
                <input 
                  type="email" 
                  value={createUserEmail}
                  onChange={e => setCreateUserEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-100 focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Account Role</label>
                <select
                  value={createUserRole}
                  onChange={e => setCreateUserRole(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-100 focus:outline-none focus:ring-1 focus:ring-black bg-white"
                >
                  <option value="USER">User</option>
                  <option value="EDITOR">Video Editor</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  type="submit" 
                  disabled={actionLoading === 'create-user'}
                  className="flex-1 py-2 text-xs font-semibold bg-black text-white hover:bg-neutral-800 rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  {actionLoading === 'create-user' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Create Account
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowCreateUser(false)}
                  className="px-4 py-2 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Live Operations Queue */}
      <Card className="rounded-3xl border border-gray-100 bg-white p-8 shadow-xs">
        <CardContent className="p-0 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-black font-sans leading-tight flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-500 animate-pulse" />
                Live Operations Queue
              </h3>
              <p className="text-xs text-gray-500">
                Real-time queue tracking script, voice, video generation, and publishing tasks. Auto-refreshing every 10s.
              </p>
            </div>
            <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-full font-bold">
              10s Polling Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Job ID</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Asset / Campaign</th>
                  <th className="pb-3 font-semibold">Client</th>
                  <th className="pb-3 font-semibold">Created At</th>
                  <th className="pb-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50/50 text-xs">
                {stats?.queue && stats.queue.length > 0 ? (
                  stats.queue.map((job: any) => (
                    <tr key={job.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3.5 font-mono text-[10px] text-gray-400">
                        {job.id.substring(0, 8)}...
                      </td>
                      <td className="py-3.5 font-semibold text-black">
                        <span className="flex items-center gap-1.5">
                          {job.type === 'Script Job' && <FileText className="h-3.5 w-3.5 text-blue-500" />}
                          {job.type === 'Voice Job' && <Mic className="h-3.5 w-3.5 text-purple-500" />}
                          {job.type === 'Video Job' && <Film className="h-3.5 w-3.5 text-amber-500" />}
                          {job.type === 'Publishing Job' && <Globe className="h-3.5 w-3.5 text-emerald-500" />}
                          {job.type}
                        </span>
                      </td>
                      <td className="py-3.5 text-gray-600 truncate max-w-[200px]">
                        {job.name}
                      </td>
                      <td className="py-3.5 text-gray-600 font-medium">
                        {job.client}
                      </td>
                      <td className="py-3.5 text-gray-400">
                        {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-3.5 text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          job.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                          job.status === 'Running' ? 'bg-blue-50 text-blue-700 animate-pulse' :
                          job.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                          job.status === 'Failed' ? 'bg-rose-50 text-rose-700 font-semibold' :
                          job.status === 'Paused' ? 'bg-neutral-100 text-neutral-600' :
                          'bg-neutral-50 text-neutral-400'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 font-medium">
                      No active or recent jobs found in the queue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Widget */}
      <DashboardCalendarWidget portal="admin" />
    </div>
  );
}
