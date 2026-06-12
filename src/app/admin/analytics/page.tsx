'use client';

import { useState, useEffect } from 'react';
import { 
  Users, Video, Share2, HardDrive, Coins, 
  Activity, Play, AlertCircle
} from 'lucide-react';

interface AnalyticsData {
  organization: {
    totalUsers: number;
    activeUsers: number;
    pausedUsers: number;
    stoppedUsers: number;
    totalEditors: number;
    activeEditors: number;
    projectsCreated: number;
    videosGenerated: number;
    videosPublished: number;
    storageUsedGB: number;
    creditsConsumed: number;
  };
  editorProductivity: Array<{
    id: string;
    name: string;
    email: string;
    availability: string;
    completedCount: number;
    pendingCount: number;
    avgCompletionTimeHours: number;
    revisionRatePercent: number;
  }>;
  userProductivity: Array<{
    id: string;
    name: string;
    email: string;
    scriptsCount: number;
    voicesCount: number;
    videosCount: number;
    publishedCount: number;
    assignmentsCount: number;
    credits: {
      scriptCredits: number;
      voiceCredits: number;
      videoCredits: number;
      publishCredits: number;
    };
  }>;
  publishingAnalytics: Array<{
    platform: string;
    total: number;
    success: number;
    failed: number;
    pending: number;
    successRatePercent: number;
  }>;
  monitoring: {
    liveProjects: Array<{
      id: string;
      name: string;
      status: string;
      updatedAt: string;
      clientName: string;
    }>;
    activeGenerations: Array<{
      id: string;
      type: string;
      status: string;
      createdAt: string;
      clientName: string;
    }>;
    assignmentsInProgress: Array<{
      id: string;
      title: string;
      status: string;
      progress: number;
      editorName: string;
    }>;
    publishingQueue: Array<{
      id: string;
      platform: string;
      status: string;
      title: string;
      clientName: string;
    }>;
    failedJobsCount: number;
  };
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/analytics');
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        setError(json.error || 'Failed to load analytics.');
      }
    } catch {
      setError('An error occurred while compiling analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 15000); // Poll every 15s for live monitoring
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="p-8 text-center text-sm text-gray-500 font-sans">
        Loading system analytics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto font-sans">
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { organization, editorProductivity, userProductivity, publishingAnalytics, monitoring } = data;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Page Title */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-black">Platform Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time system health, credits, storage, and publishing productivity.</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="bg-black hover:bg-neutral-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
        >
          Refresh Data
        </button>
      </div>

      {/* Grid: Core Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Users & Editors */}
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 text-neutral-800">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              {organization.activeUsers} Active
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-black">{organization.totalUsers} Clients</h3>
            <p className="text-gray-400 text-xs mt-1">
              {organization.totalEditors} Editors ({organization.activeEditors} active)
            </p>
          </div>
          <div className="pt-2 border-t border-gray-50 flex justify-between text-[10px] text-gray-400 font-semibold">
            <span>Paused: {organization.pausedUsers}</span>
            <span>Stopped: {organization.stoppedUsers}</span>
          </div>
        </div>

        {/* Card 2: Generations */}
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 text-neutral-800">
              <Video className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
              {organization.projectsCreated} Projects
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-black">{organization.videosGenerated} Videos</h3>
            <p className="text-gray-400 text-xs mt-1">Generated by users using AI engines</p>
          </div>
          <div className="pt-2 border-t border-gray-50 flex justify-between text-[10px] text-gray-400 font-semibold">
            <span>Total Completed</span>
          </div>
        </div>

        {/* Card 3: Storage */}
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 text-neutral-800">
              <HardDrive className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Cloudflare R2
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-black">{organization.storageUsedGB} GB</h3>
            <p className="text-gray-400 text-xs mt-1">Aggregate storage space consumed</p>
          </div>
          <div className="pt-2 border-t border-gray-50 flex justify-between text-[10px] text-gray-400 font-semibold">
            <span>Aggregated from raw + edited video files</span>
          </div>
        </div>

        {/* Card 4: Credits & Billing */}
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 text-neutral-800">
              <Coins className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-full">
              Transactions
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-black">{organization.creditsConsumed} Consumed</h3>
            <p className="text-gray-400 text-xs mt-1">Total billing events triggered</p>
          </div>
          <div className="pt-2 border-t border-gray-50 flex justify-between text-[10px] text-gray-400 font-semibold">
            <span>Includes script, voice, video, & publishing</span>
          </div>
        </div>
      </div>

      {/* Live Monitoring Dashboard (Real-time Queues) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-neutral-800" />
              <h2 className="text-lg font-bold text-black">Live Monitoring Queue</h2>
            </div>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          </div>

          <div className="space-y-6">
            {/* Active AI Generations */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex justify-between">
                <span>Active Generations</span>
                <span className="font-semibold text-neutral-800 lowercase">({monitoring.activeGenerations.length} processing)</span>
              </h4>
              {monitoring.activeGenerations.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No active generations right now.</p>
              ) : (
                <div className="space-y-2">
                  {monitoring.activeGenerations.map((g) => (
                    <div key={g.id} className="flex justify-between items-center bg-neutral-50 border border-neutral-100 p-3 rounded-xl text-xs">
                      <div className="flex items-center gap-3">
                        <Play className="h-3.5 w-3.5 text-neutral-600 animate-pulse" />
                        <div>
                          <p className="font-bold text-black">{g.type} Generation</p>
                          <p className="text-gray-400 text-[10px]">Client: {g.clientName}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold rounded text-[10px]">
                        {g.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assignments in Progress */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex justify-between">
                <span>Editor Assignments</span>
                <span className="font-semibold text-neutral-800 lowercase">({monitoring.assignmentsInProgress.length} active)</span>
              </h4>
              {monitoring.assignmentsInProgress.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No active editing assignments.</p>
              ) : (
                <div className="space-y-2">
                  {monitoring.assignmentsInProgress.map((a) => (
                    <div key={a.id} className="bg-neutral-50 border border-neutral-100 p-3 rounded-xl text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-black">{a.title}</p>
                          <p className="text-gray-400 text-[10px]">Editor: {a.editorName}</p>
                        </div>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded text-[10px]">
                          {a.status}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-black h-full rounded-full" style={{ width: `${a.progress}%` }} />
                        </div>
                        <span className="font-bold text-[10px]">{a.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Publishing Queue */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex justify-between">
                <span>Social Publishing Queue</span>
                <span className="font-semibold text-neutral-800 lowercase">({monitoring.publishingQueue.length} pending)</span>
              </h4>
              {monitoring.publishingQueue.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No videos currently publishing.</p>
              ) : (
                <div className="space-y-2">
                  {monitoring.publishingQueue.map((p) => (
                    <div key={p.id} className="flex justify-between items-center bg-neutral-50 border border-neutral-100 p-3 rounded-xl text-xs">
                      <div>
                        <p className="font-bold text-black">{p.title}</p>
                        <p className="text-gray-400 text-[10px]">Platform: <span className="capitalize">{p.platform}</span> | Client: {p.clientName}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-neutral-200 text-neutral-800 font-bold rounded text-[10px] animate-pulse">
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Publishing Platform Success Rates */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-lg font-bold text-black">Publishing Productivity</h2>
            <p className="text-gray-400 text-xs mt-1">Platform-wise success and publishing delivery rates.</p>
          </div>

          <div className="space-y-4">
            {publishingAnalytics.map((p) => (
              <div key={p.platform} className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <Share2 className="h-3.5 w-3.5 text-gray-400" />
                    <span className="font-bold capitalize">{p.platform}</span>
                  </div>
                  <span className="font-medium text-gray-400">
                    {p.success} / {p.total} ({p.successRatePercent}%)
                  </span>
                </div>
                {/* Visual success bar */}
                <div className="bg-gray-100 h-2 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${p.successRatePercent}%` }} />
                </div>
                {/* Breakout detail */}
                <div className="flex justify-between text-[9px] text-gray-400 font-semibold px-0.5">
                  <span>Failed: {p.failed}</span>
                  <span>Queue: {p.pending}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs flex gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <div>
              <p className="font-bold">Failed Publications Audit</p>
              <p className="text-rose-700/80 mt-0.5">
                There are {monitoring.failedJobsCount} recorded publication failures. Admins can audit these details in the reports panel.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Editor & User Performance Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Editor Throughput Table */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-bold text-lg text-black">Editor Productivity & Speed</h3>
            <p className="text-gray-400 text-xs mt-1">Speed, throughput, and quality audit per editor.</p>
          </div>
          {editorProductivity.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-xs">No editors available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="p-4">Editor</th>
                    <th className="p-4">Completed</th>
                    <th className="p-4">Pending</th>
                    <th className="p-4">Avg Speed</th>
                    <th className="p-4">Revision Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {editorProductivity.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50/50">
                      <td className="p-4">
                        <p className="font-bold text-black">{e.name}</p>
                        <p className="text-gray-400 text-[10px]">{e.email}</p>
                      </td>
                      <td className="p-4 font-semibold text-black">{e.completedCount}</td>
                      <td className="p-4 text-gray-500">{e.pendingCount}</td>
                      <td className="p-4 text-gray-500">{e.avgCompletionTimeHours}h</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          e.revisionRatePercent > 20 ? 'bg-rose-50 text-rose-700' : 'bg-green-50 text-green-700'
                        }`}>
                          {e.revisionRatePercent}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* User Activity & Credits Remaining Table */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-bold text-lg text-black">Client Asset Generation & Credits</h3>
            <p className="text-gray-400 text-xs mt-1">Audit of client workspace activity and credit reserves.</p>
          </div>
          {userProductivity.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-xs">No clients active.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="p-4">Client</th>
                    <th className="p-4">Assets (Sc/Vo/Vi/Pu)</th>
                    <th className="p-4">Credits (Sc/Vo/Vi/Pu)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {userProductivity.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50">
                      <td className="p-4">
                        <p className="font-bold text-black">{u.name}</p>
                        <p className="text-gray-400 text-[10px]">{u.email}</p>
                      </td>
                      <td className="p-4 font-semibold text-black">
                        {u.scriptsCount} / {u.voicesCount} / {u.videosCount} / {u.publishedCount}
                      </td>
                      <td className="p-4 text-gray-500 font-mono">
                        {u.credits.scriptCredits} / {u.credits.voiceCredits} / {u.credits.videoCredits} / {u.credits.publishCredits}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
