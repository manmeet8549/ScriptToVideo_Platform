'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { editorsApi, ConnectionDetails, NotificationItem } from '@/lib/api';
import { 
  Loader2, Users, Bell, Download, Upload, Check, 
  Clock, Play, FileText, AlertCircle, ChevronDown, 
  Calendar, CheckSquare, ListTodo, Sliders, ExternalLink, ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

interface EditedVideo {
  id: string;
  assignmentId: string;
  originalVideoId: string;
  editedVideoUrl: string;
  editedVideoKey: string;
  thumbnailUrl: string | null;
  thumbnailKey: string | null;
  version: number;
  uploadedBy: string;
  uploadedAt: string;
}

interface VideoAssignment {
  id: string;
  videoId: string;
  userId: string;
  editorId: string;
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'REVIEW' | 'REVISION_REQUESTED' | 'COMPLETED' | 'APPROVED' | 'REJECTED';
  progress: number;
  estimatedHours: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  video: {
    id: string;
    title: string;
    videoUrl: string;
    thumbnailUrl: string | null;
  };
  user: {
    name: string | null;
    email: string;
  };
  editor: {
    name: string | null;
    email: string;
  };
  editedVideos: EditedVideo[];
}

export default function EditorDashboard() {
  const [connections, setConnections] = useState<ConnectionDetails[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [assignments, setAssignments] = useState<VideoAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<{ availability: string } | null>(null);
  
  // Interactive UI States
  const [isAvailabilityDropdownOpen, setIsAvailabilityDropdownOpen] = useState(false);
  const [activePipelineTab, setActivePipelineTab] = useState<'NEW' | 'ACTIVE' | 'REVIEW' | 'COMPLETED'>('ACTIVE');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editProgress, setEditProgress] = useState<Record<string, number>>({});
  const [editEta, setEditEta] = useState<Record<string, string>>({});

  // Upload overlay state
  const [uploadingAssignment, setUploadingAssignment] = useState<VideoAssignment | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError('');
      const [connRes, notifRes, profileRes] = await Promise.all([
        editorsApi.myUsers(),
        editorsApi.getNotifications(),
        editorsApi.getProfile(),
      ]);
      setConnections(connRes.connections || []);
      setNotifications(notifRes.notifications || []);
      setProfile(profileRes.profile || null);

      // Fetch editor assignments
      const assignmentsRes = await fetch('/api/assignments/editor');
      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        const assignmentsList = assignmentsData.assignments || [];
        setAssignments(assignmentsList);

        // Initialize progress/eta local maps for slider controls
        const progressMap: Record<string, number> = {};
        const etaMap: Record<string, string> = {};
        assignmentsList.forEach((a: VideoAssignment) => {
          progressMap[a.id] = a.progress;
          etaMap[a.id] = a.estimatedHours ? String(a.estimatedHours) : '';
        });
        setEditProgress(progressMap);
        setEditEta(etaMap);
      } else {
        setError('Failed to fetch assignments pipeline.');
      }
    } catch {
      setError('Failed to retrieve dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMarkNotificationsRead = async () => {
    try {
      const res = await editorsApi.markNotificationsRead();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch {
      console.error('Failed to mark notifications as read.');
    }
  };

  const handleAccept = async (assignmentId: string) => {
    setUpdatingId(assignmentId);
    try {
      const res = await fetch('/api/assignments/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      });
      if (res.ok) {
        await fetchData();
        setActivePipelineTab('ACTIVE');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to accept assignment.');
      }
    } catch {
      alert('Network failure accepting assignment.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDecline = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to decline this assignment?')) return;
    setUpdatingId(assignmentId);
    try {
      const res = await fetch('/api/assignments/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      });
      if (res.ok) {
        await fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to decline assignment.');
      }
    } catch {
      alert('Network failure declining assignment.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateProgress = async (assignmentId: string) => {
    setUpdatingId(assignmentId);
    try {
      const prog = editProgress[assignmentId] ?? 0;
      const eta = editEta[assignmentId] ? parseInt(editEta[assignmentId], 10) : undefined;

      const res = await fetch('/api/assignments/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, progress: prog, estimatedHours: eta }),
      });

      if (res.ok) {
        await fetchData();
        alert('Progress updated successfully!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update progress.');
      }
    } catch {
      alert('Network error updating progress.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateAvailability = async (status: 'AVAILABLE' | 'BUSY' | 'OFFLINE') => {
    setIsAvailabilityDropdownOpen(false);
    try {
      const res = await fetch('/api/editors/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: status }),
      });
      if (res.ok) {
        await fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update availability.');
      }
    } catch {
      alert('Error changing availability status.');
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadingAssignment || !videoFile) return;

    setUploadLoading(true);
    setUploadError(null);
    setUploadProgressMsg('Generating pre-signed R2 upload URLs...');

    try {
      const hasThumb = !!thumbnailFile;
      const qs = new URLSearchParams({
        assignmentId: uploadingAssignment.id,
        contentType: videoFile.type,
        hasThumbnail: String(hasThumb),
      });

      const urlRes = await fetch(`/api/assignments/upload?${qs}`);
      if (!urlRes.ok) {
        const data = await urlRes.json();
        throw new Error(data.error || 'Failed to obtain pre-signed URLs');
      }

      const { videoUrl, thumbnailUrl, videoKey, thumbnailKey, version } = await urlRes.json();

      setUploadProgressMsg('Uploading video draft directly to R2 storage...');
      const videoPutRes = await fetch(videoUrl, {
        method: 'PUT',
        body: videoFile,
        headers: { 'Content-Type': videoFile.type },
      });

      if (!videoPutRes.ok) {
        throw new Error('Failed to upload video binary to object storage.');
      }

      if (thumbnailUrl && thumbnailFile) {
        setUploadProgressMsg('Uploading thumbnail image to R2 storage...');
        const thumbPutRes = await fetch(thumbnailUrl, {
          method: 'PUT',
          body: thumbnailFile,
          headers: { 'Content-Type': thumbnailFile.type },
        });

        if (!thumbPutRes.ok) {
          throw new Error('Failed to upload thumbnail image to object storage.');
        }
      }

      setUploadProgressMsg('Saving draft records in database...');
      const completeRes = await fetch('/api/assignments/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: uploadingAssignment.id,
          videoKey,
          thumbnailKey: thumbnailKey || undefined,
          version,
        }),
      });

      if (!completeRes.ok) {
        const data = await completeRes.json();
        throw new Error(data.error || 'Failed to register completed upload with system.');
      }

      setUploadingAssignment(null);
      setVideoFile(null);
      setThumbnailFile(null);
      await fetchData();
      setActivePipelineTab('REVIEW');
      alert('Draft uploaded successfully and sent for review!');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setUploadError(err.message);
      } else {
        setUploadError('An unexpected upload error occurred.');
      }
    } finally {
      setUploadLoading(false);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  // Metric Computations
  const newRequests = assignments.filter((a) => a.status === 'PENDING');
  const activeAssignments = assignments.filter((a) => 
    ['ACCEPTED', 'IN_PROGRESS', 'REVISION_REQUESTED'].includes(a.status)
  );
  const reviewAssignments = assignments.filter((a) => a.status === 'REVIEW');
  const completedAssignments = assignments.filter((a) => 
    ['APPROVED', 'COMPLETED'].includes(a.status)
  );

  const currentTabList = 
    activePipelineTab === 'NEW' ? newRequests :
    activePipelineTab === 'ACTIVE' ? activeAssignments :
    activePipelineTab === 'REVIEW' ? reviewAssignments :
    completedAssignments;

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Overdue and Completed Today counters
  const completedToday = completedAssignments.filter((a) => {
    if (!a.completedAt) return false;
    const compDate = new Date(a.completedAt).toDateString();
    const today = new Date().toDateString();
    return compDate === today;
  }).length;

  // Overdue is active assignments that exceeded estimatedHours
  const getAssignmentDeadlineState = (a: VideoAssignment) => {
    if (!a.estimatedHours) return { label: 'No ETA set', isOverdue: false, diffHours: 0 };
    const createdDate = new Date(a.createdAt);
    const dueDate = new Date(createdDate.getTime() + a.estimatedHours * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 0) {
      return {
        label: `Overdue by ${Math.abs(diffHours)}h`,
        isOverdue: true,
        diffHours
      };
    } else if (diffHours === 0) {
      return { label: 'Due now', isOverdue: false, diffHours };
    } else if (diffHours < 24) {
      return { label: `Due in ${diffHours}h`, isOverdue: false, diffHours };
    } else {
      const days = Math.round(diffHours / 24);
      return { label: `Due in ${days}d`, isOverdue: false, diffHours };
    }
  };

  const overdueJobsCount = activeAssignments.filter((a) => getAssignmentDeadlineState(a).isOverdue).length;

  // Capacity calculations (Max target: 10 active tasks)
  const maxCapacity = 10;
  const currentActiveCount = activeAssignments.length;
  const capacityPercent = Math.min(100, Math.round((currentActiveCount / maxCapacity) * 100));

  if (loading && connections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-3" />
        <p className="text-sm text-gray-500 font-sans">Loading editor dashboard...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8 relative pb-28 font-sans bg-[#fcfcfc]">
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-neutral-100">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 border border-neutral-200/50 px-2.5 py-0.5 text-xs font-semibold text-neutral-800">
            <Sliders className="h-3.5 w-3.5 text-neutral-500" />
            Workspace
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 mt-1">
            Studio Dashboard
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            Monitor client link updates, render queues, deadline logs, and upload completed video drafts.
          </p>
        </div>
        
        <button 
          onClick={fetchData}
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Modern High-Fidelity Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Connected Clients */}
        <Card className="rounded-3xl border border-neutral-100 bg-white shadow-xs p-5 relative overflow-hidden transition-all duration-200 hover:shadow-md group">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block">Connected Clients</span>
              <span className="text-3xl font-extrabold text-black block">{connections.length}</span>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-600 transition-colors group-hover:bg-neutral-900 group-hover:text-white">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between border-t border-neutral-50 pt-3.5">
            {/* Avatars Stack */}
            <div className="flex -space-x-1.5 overflow-hidden">
              {connections.slice(0, 4).map((c) => (
                <div 
                  key={c.id} 
                  title={c.user?.name || c.user?.email || ''}
                  className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-neutral-900 text-white text-[8px] font-bold flex items-center justify-center"
                >
                  {getInitials(c.user?.name || null, c.user?.email || '')}
                </div>
              ))}
              {connections.length > 4 && (
                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-neutral-150 text-neutral-600 text-[8px] font-bold flex items-center justify-center">
                  +{connections.length - 4}
                </div>
              )}
              {connections.length === 0 && (
                <span className="text-[10px] font-semibold text-neutral-400">No linked clients</span>
              )}
            </div>

            <Link href="/editor/connections" className="text-[10px] font-extrabold text-neutral-600 hover:text-black inline-flex items-center gap-0.5 hover:underline">
              Manage
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>

        {/* Card 2: Pending Requests */}
        <Card className="rounded-3xl border border-neutral-100 bg-white shadow-xs p-5 relative overflow-hidden transition-all duration-200 hover:shadow-md group">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block">New Assignments</span>
              <span className="text-3xl font-extrabold text-black block">{newRequests.length}</span>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-orange-50 border border-orange-100/60 flex items-center justify-center text-orange-600 transition-colors group-hover:bg-orange-600 group-hover:text-white">
              <FileText className="h-4.5 w-4.5" />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-neutral-50 pt-3.5">
            <span className="text-[10px] font-bold text-neutral-500 flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${newRequests.length > 0 ? 'bg-orange-500 animate-pulse' : 'bg-neutral-300'}`} />
              {newRequests.length > 0 ? 'Action Required' : 'All caught up'}
            </span>

            {newRequests.length > 0 && (
              <button 
                onClick={() => setActivePipelineTab('NEW')}
                className="text-[10px] font-extrabold text-orange-600 hover:text-orange-800 inline-flex items-center gap-0.5 hover:underline"
              >
                Review
                <ArrowUpRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </Card>

        {/* Card 3: Projects in Progress */}
        <Card className="rounded-3xl border border-neutral-100 bg-white shadow-xs p-5 relative overflow-hidden transition-all duration-200 hover:shadow-md group">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block">Projects In Progress</span>
              <span className="text-3xl font-extrabold text-black block">{currentActiveCount}</span>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100/60 flex items-center justify-center text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 items-center justify-between border-t border-neutral-50 pt-3.5 text-[9px] font-bold text-neutral-500">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">
                {completedToday} Done Today
              </span>
              {overdueJobsCount > 0 && (
                <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-100 animate-pulse">
                  {overdueJobsCount} Overdue
                </span>
              )}
            </div>
            
            <button 
              onClick={() => setActivePipelineTab('ACTIVE')}
              className="text-[10px] font-extrabold text-neutral-600 hover:text-black inline-flex items-center gap-0.5 hover:underline"
            >
              Track
            </button>
          </div>
        </Card>

        {/* Card 4: Availability & Capacity Dropdown */}
        <Card className="rounded-3xl border border-neutral-100 bg-white shadow-xs p-5 relative transition-all duration-200 hover:shadow-md">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5 w-full">
              <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block">Availability Status</span>
              
              {/* Availability interactive dropdown button */}
              <div className="relative mt-1">
                <button
                  onClick={() => setIsAvailabilityDropdownOpen(!isAvailabilityDropdownOpen)}
                  className="flex items-center justify-between w-full border border-neutral-150 rounded-xl px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100/80 transition-all text-xs font-bold text-neutral-800"
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${
                      profile?.availability === 'AVAILABLE' ? 'bg-green-500 animate-pulse' :
                      profile?.availability === 'BUSY' ? 'bg-amber-500' :
                      'bg-neutral-450'
                    }`} />
                    <span className="capitalize">{(profile?.availability || 'OFFLINE').toLowerCase()}</span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
                </button>

                {isAvailabilityDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsAvailabilityDropdownOpen(false)} />
                    <div className="absolute right-0 left-0 mt-1.5 bg-white border border-neutral-150 shadow-xl rounded-2xl py-1 z-40 overflow-hidden text-xs font-bold text-neutral-700 animate-in fade-in slide-in-from-top-1 duration-150">
                      {[
                        { id: 'AVAILABLE' as const, label: 'Available', color: 'bg-green-500' },
                        { id: 'BUSY' as const, label: 'Busy / At Limit', color: 'bg-amber-500' },
                        { id: 'OFFLINE' as const, label: 'Offline / Away', color: 'bg-neutral-400' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleUpdateAvailability(item.id)}
                          className="flex items-center gap-2 px-3.5 py-2 w-full text-left hover:bg-neutral-50 text-neutral-700 hover:text-black transition-colors"
                        >
                          <span className={`h-2 w-2 rounded-full ${item.color}`} />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-neutral-50 pt-3 text-[10px] font-bold text-neutral-500 flex justify-between items-center">
            <span>Capacity</span>
            <span className="font-extrabold text-neutral-800">{currentActiveCount} / {maxCapacity} Projects</span>
          </div>
        </Card>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Workload progress, Actions, Pipeline */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Workload Capacity Bar and Quick Actions Panel */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            
            {/* Workload Capacity Bar */}
            <Card className="rounded-3xl border border-neutral-100 bg-white p-5 shadow-xs md:col-span-6 flex flex-col justify-between">
              <div className="space-y-1">
                <h3 className="text-xs font-extrabold text-neutral-700 uppercase tracking-wider">
                  Workload Status
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Calculated against your target limit of {maxCapacity} projects.
                </p>
              </div>

              <div className="space-y-2 mt-4">
                <div className="flex justify-between items-end text-xs font-bold">
                  <span className="text-neutral-500">{capacityPercent}% Capacity Used</span>
                  <span className="text-neutral-900">{currentActiveCount} Active Jobs</span>
                </div>
                <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden border border-neutral-200/50 p-0.5">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      capacityPercent >= 80 ? 'bg-rose-500' :
                      capacityPercent >= 50 ? 'bg-amber-500' :
                      'bg-neutral-900'
                    }`}
                    style={{ width: `${capacityPercent}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* Quick Actions Panel */}
            <Card className="rounded-3xl border border-neutral-100 bg-white p-5 shadow-xs md:col-span-6 flex flex-col justify-between">
              <div className="space-y-1">
                <h3 className="text-xs font-extrabold text-neutral-700 uppercase tracking-wider">
                  Quick Actions
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Trigger actions across your production channels instantly.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mt-4">
                <button
                  onClick={() => {
                    if (activeAssignments.length > 0) {
                      setUploadingAssignment(activeAssignments[0]);
                    } else {
                      alert('You do not have any In-Progress assignments. Accept a request first!');
                    }
                  }}
                  className="bg-neutral-900 hover:bg-black text-white py-2 px-3 rounded-xl text-[10px] font-extrabold transition-all text-center flex items-center justify-center gap-1 border border-neutral-900 hover:scale-102 cursor-pointer"
                >
                  <Upload className="h-3 w-3 shrink-0" />
                  Upload Draft
                </button>
                <button
                  onClick={() => setActivePipelineTab('NEW')}
                  className="bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 py-2 px-3 rounded-xl text-[10px] font-extrabold transition-all text-center flex items-center justify-center gap-1 hover:scale-102 cursor-pointer"
                >
                  <ListTodo className="h-3 w-3 shrink-0 text-neutral-500" />
                  View Requests
                </button>
                <button
                  onClick={() => {
                    const el = document.getElementById('pipeline-header');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 py-2 px-3 rounded-xl text-[10px] font-extrabold transition-all text-center flex items-center justify-center gap-1 hover:scale-102 cursor-pointer"
                >
                  <Clock className="h-3 w-3 shrink-0 text-neutral-500" />
                  Update Progress
                </button>
                <Link
                  href="/editor/calendar"
                  className="bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 py-2 px-3 rounded-xl text-[10px] font-extrabold transition-all text-center flex items-center justify-center gap-1 hover:scale-102"
                >
                  <Calendar className="h-3 w-3 shrink-0 text-neutral-500" />
                  Open Calendar
                </Link>
              </div>
            </Card>

          </div>

          {/* Assignments Pipeline Card */}
          <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white overflow-hidden p-6">
            <h3 id="pipeline-header" className="font-extrabold text-lg text-black border-b border-neutral-50 pb-3 mb-4 flex items-center justify-between">
              <span>Assignments Pipeline</span>
              <span className="text-xs text-neutral-400 font-semibold">Stage view</span>
            </h3>

            {/* Pipeline Tabs */}
            <div className="flex border-b border-gray-100 pb-3 mb-6 gap-2 overflow-x-auto">
              {[
                { id: 'NEW' as const, label: 'New Requests', count: newRequests.length },
                { id: 'ACTIVE' as const, label: 'In Progress', count: activeAssignments.length },
                { id: 'REVIEW' as const, label: 'In Review', count: reviewAssignments.length },
                { id: 'COMPLETED' as const, label: 'Completed', count: completedAssignments.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActivePipelineTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    activePipelineTab === tab.id
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-500 border-gray-150 hover:bg-neutral-50'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold ${
                      activePipelineTab === tab.id ? 'bg-white/25 text-white' : 'bg-neutral-150 text-neutral-700'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Pipeline list */}
            {currentTabList.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm space-y-2">
                <FileText className="h-8 w-8 text-gray-250 mx-auto" />
                <p className="font-semibold text-neutral-400">No assignments in this stage.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {currentTabList.map((assignment) => {
                  const deadlineState = getAssignmentDeadlineState(assignment);
                  return (
                    <div
                      key={assignment.id}
                      className="p-5 border border-neutral-100 hover:border-neutral-200 bg-white rounded-2xl space-y-4 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <h4 className="font-bold text-sm text-neutral-950 leading-snug">{assignment.video.title}</h4>
                          <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
                            Client: {assignment.user.name || 'Client'} ({assignment.user.email})
                          </p>
                        </div>
                        <div className="flex gap-2 items-center">
                          <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                            assignment.status === 'PENDING' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                            assignment.status === 'ACCEPTED' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            assignment.status === 'IN_PROGRESS' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                            assignment.status === 'REVIEW' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                            assignment.status === 'REVISION_REQUESTED' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            'bg-emerald-50 text-emerald-700 border-emerald-100'
                          }`}>
                            {assignment.status}
                          </span>
                          {['ACCEPTED', 'IN_PROGRESS', 'REVISION_REQUESTED'].includes(assignment.status) && (
                            <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                              deadlineState.isOverdue 
                                ? 'bg-rose-50 text-rose-700 border-rose-100 animate-pulse'
                                : 'bg-neutral-50 text-neutral-600 border-neutral-150'
                            }`}>
                              {deadlineState.label}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Original video download section */}
                      <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-lg bg-neutral-200/60 flex items-center justify-center text-neutral-600">
                            <Play className="h-3.5 w-3.5" />
                          </div>
                          <div className="text-[11px]">
                            <p className="font-bold text-neutral-800">Original Source Video</p>
                            <p className="text-gray-400 font-semibold text-[10px]">Download asset to edit</p>
                          </div>
                        </div>
                        <a
                          href={assignment.video.videoUrl}
                          download
                          className="inline-flex items-center gap-1 text-[10px] font-extrabold text-black border border-neutral-250 bg-white hover:bg-neutral-50 px-3 py-1.5 rounded-xl transition-all"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </a>
                      </div>

                      {assignment.notes && (
                        <div className="text-xs font-semibold text-gray-500 bg-neutral-50/50 border border-neutral-100 rounded-xl p-3.5 whitespace-pre-line leading-relaxed">
                          <span className="font-bold text-neutral-800 block mb-1">Client Notes:</span>
                          {assignment.notes}
                        </div>
                      )}

                      {/* Action panel by stage */}
                      {assignment.status === 'PENDING' && (
                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={() => handleDecline(assignment.id)}
                            disabled={updatingId === assignment.id}
                            className="flex-1 py-2 rounded-xl border border-rose-100 text-rose-600 bg-white hover:bg-rose-50/50 transition-colors text-xs font-bold cursor-pointer"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleAccept(assignment.id)}
                            disabled={updatingId === assignment.id}
                            className="flex-1 py-2 rounded-xl bg-black text-white hover:bg-neutral-800 transition-colors text-xs font-bold cursor-pointer"
                          >
                            Accept Assignment
                          </button>
                        </div>
                      )}

                      {['ACCEPTED', 'IN_PROGRESS', 'REVISION_REQUESTED'].includes(assignment.status) && (
                        <div className="pt-3 border-t border-neutral-100 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            {/* Slider progress */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                                Work Progress: {editProgress[assignment.id] ?? 0}%
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="99"
                                value={editProgress[assignment.id] ?? 0}
                                onChange={(e) => setEditProgress({
                                  ...editProgress,
                                  [assignment.id]: parseInt(e.target.value, 10),
                                })}
                                className="w-full accent-black cursor-pointer"
                              />
                            </div>

                            {/* Hours ETA */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                                ETA (Estimated Hours)
                              </label>
                              <select
                                value={editEta[assignment.id] ?? ''}
                                onChange={(e) => setEditEta({
                                  ...editEta,
                                  [assignment.id]: e.target.value,
                                })}
                                className="w-full border border-neutral-200 rounded-xl p-2 text-xs font-bold text-gray-600 focus:outline-hidden cursor-pointer bg-white"
                              >
                                <option value="">No ETA set</option>
                                <option value="6">6 Hours</option>
                                <option value="12">12 Hours</option>
                                <option value="24">24 Hours (1 Day)</option>
                                <option value="48">48 Hours (2 Days)</option>
                                <option value="72">72 Hours (3 Days)</option>
                                <option value="120">120 Hours (5 Days)</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button
                              onClick={() => handleUpdateProgress(assignment.id)}
                              disabled={updatingId === assignment.id}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl border border-neutral-200 text-gray-700 bg-white hover:bg-neutral-50 transition-colors cursor-pointer"
                            >
                              <Clock className="h-3.5 w-3.5" />
                              Update Status/ETA
                            </button>
                            <button
                              onClick={() => {
                                setUploadingAssignment(assignment);
                                setUploadError(null);
                              }}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl bg-black text-white hover:bg-neutral-800 transition-colors shadow-xs cursor-pointer animate-pulse"
                            >
                              <Upload className="h-3.5 w-3.5" />
                              Upload Edited Version
                            </button>
                          </div>
                        </div>
                      )}

                      {assignment.status === 'REVIEW' && (
                        <div className="pt-3 border-t border-neutral-100 space-y-2">
                          <p className="text-xs text-gray-400 font-bold flex items-center gap-1.5">
                            <Loader2 className="h-3.5 w-3.5 text-purple-500 animate-spin" />
                            Draft submitted. Awaiting client review and approval.
                          </p>
                          {assignment.editedVideos.length > 0 && (
                            <div className="text-[10px] text-gray-500 font-semibold bg-neutral-50 px-2.5 py-1.5 rounded-lg border border-neutral-100 inline-block">
                              Uploaded Versions: {assignment.editedVideos.map((ed) => `v${ed.version}`).join(', ')}
                            </div>
                          )}
                        </div>
                      )}

                      {['APPROVED', 'COMPLETED'].includes(assignment.status) && (
                        <div className="pt-3 border-t border-neutral-100">
                          <p className="text-xs text-emerald-600 font-bold flex items-center gap-1.5">
                            <Check className="h-4 w-4 bg-emerald-500 text-white rounded-full p-0.5" />
                            Draft approved by creator. File completed.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

        </div>

        {/* Right Column: Deadlines timeline, Inbox logs, Client rosters */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Upcoming Deadlines Widget */}
          <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white overflow-hidden p-6">
            <h3 className="font-extrabold text-base text-black border-b border-neutral-50 pb-3 mb-4 flex items-center gap-1.5">
              <Calendar className="h-4.5 w-4.5 text-neutral-400" />
              Upcoming Deadlines
            </h3>

            {activeAssignments.length === 0 ? (
              <div className="py-6 text-center text-gray-400 text-xs font-semibold">
                No active deadlines in the queue.
              </div>
            ) : (
              <div className="space-y-3.5">
                {activeAssignments.map((a) => {
                  const deadlineState = getAssignmentDeadlineState(a);
                  return (
                    <div 
                      key={a.id} 
                      className={`p-3 rounded-2xl border text-xs flex justify-between items-start gap-4 hover:border-neutral-200 transition-all ${
                        deadlineState.isOverdue 
                          ? 'bg-rose-50/40 border-rose-100'
                          : 'bg-white border-neutral-100'
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-neutral-800 leading-tight truncate max-w-[170px]" title={a.video.title}>
                          {a.video.title}
                        </p>
                        <p className="text-[10px] text-gray-400 font-semibold truncate max-w-[150px]">
                          Client: {a.user.name || 'Anonymous'}
                        </p>
                      </div>

                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md shrink-0 border uppercase tracking-wider text-center ${
                        deadlineState.isOverdue 
                          ? 'bg-rose-100 text-rose-800 border-rose-200' 
                          : 'bg-neutral-50 text-neutral-600 border-neutral-150'
                      }`}>
                        {deadlineState.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Inbox notifications */}
          <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white overflow-hidden p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-50 pb-3">
              <h3 className="font-bold text-base text-black flex items-center gap-2">
                <Bell className="h-4.5 w-4.5 text-neutral-500" />
                Inbox Logs
                {unreadCount > 0 && (
                  <span className="bg-black text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkNotificationsRead}
                  className="text-xs font-semibold text-neutral-400 hover:text-black transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-neutral-400 text-xs font-medium">
                  Logs inbox is empty.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-xl border text-[11px] space-y-1 leading-normal ${
                      n.read
                        ? 'bg-neutral-50/50 border-neutral-100 text-neutral-500'
                        : 'bg-white border-neutral-150 text-black shadow-xs font-medium'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-neutral-800">{n.title}</span>
                      <span className="text-[9px] text-neutral-400">
                        {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-neutral-500 font-semibold">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Active Clients */}
          <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white overflow-hidden p-6">
            <h3 className="font-bold text-base text-black border-b border-neutral-50 pb-3 mb-4">
              Client Roster
            </h3>
            {connections.length === 0 ? (
              <div className="py-6 text-center text-gray-400 text-xs font-medium">
                No active connections. Share your key in settings.
              </div>
            ) : (
              <div className="space-y-3">
                {connections.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border-b border-gray-50 pb-2.5 last:border-b-0 last:pb-0">
                    <div className="text-xs">
                      <p className="font-bold text-neutral-800 leading-tight">{c.user?.name || 'Anonymous Creator'}</p>
                      <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{c.user?.email}</p>
                    </div>
                    <span className="inline-flex items-center justify-center h-4.5 px-1.5 rounded-full text-[9px] font-extrabold bg-neutral-50 text-neutral-500 border border-neutral-150">
                      {c.activeProjects} active
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>

      </div>

      {/* Upload Edited Version Overlay Modal */}
      {uploadingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => !uploadLoading && setUploadingAssignment(null)} />
          <div className="relative bg-white rounded-3xl border border-gray-150 shadow-2xl p-6 z-50 w-full max-w-md space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-black font-sans">Upload Edited Draft</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[280px]">
                  Video: {uploadingAssignment.video.title}
                </p>
              </div>
              <button
                onClick={() => !uploadLoading && setUploadingAssignment(null)}
                disabled={uploadLoading}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-black transition-colors disabled:opacity-50"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 block uppercase tracking-wider">
                  Video File (.mp4) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept="video/mp4"
                  required
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-gray-50 file:text-black hover:file:bg-gray-100 cursor-pointer border border-gray-200 rounded-xl p-2 focus:outline-none"
                  disabled={uploadLoading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 block uppercase tracking-wider">
                  Thumbnail Image (.jpg/.png, Optional)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-gray-50 file:text-black hover:file:bg-gray-100 cursor-pointer border border-gray-200 rounded-xl p-2 focus:outline-none"
                  disabled={uploadLoading}
                />
              </div>

              {uploadError && (
                <div className="text-xs font-semibold text-red-500 bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadLoading && (
                <div className="p-3 bg-neutral-50 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                    <Loader2 className="h-4.5 w-4.5 text-black animate-spin" />
                    <span>{uploadProgressMsg}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadingAssignment(null)}
                  disabled={uploadLoading}
                  className="flex-1 py-2.5 text-xs font-bold rounded-2xl border border-gray-250 text-gray-600 bg-white hover:bg-neutral-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading || !videoFile}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-2xl bg-black text-white hover:bg-neutral-800 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {uploadLoading ? 'Uploading...' : 'Upload Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
