'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { editorsApi, ConnectionDetails, NotificationItem } from '@/lib/api';
import { 
  Loader2, Users, Bell, Download, Upload, Check, 
  Clock, Play, FileText, AlertCircle 
} from 'lucide-react';

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

  // Pipeline navigation tab
  const [activePipelineTab, setActivePipelineTab] = useState<'NEW' | 'ACTIVE' | 'REVIEW' | 'COMPLETED'>('NEW');

  // Assignment updates state
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

  // Direct pre-signed R2 PUT uploading method
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadingAssignment || !videoFile) return;

    setUploadLoading(true);
    setUploadError(null);
    setUploadProgressMsg('Generating pre-signed R2 upload URLs...');

    try {
      // 1. Get pre-signed URL
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

      // 2. Upload video binary via direct PUT request to R2
      setUploadProgressMsg('Uploading video draft directly to R2 storage...');
      const videoPutRes = await fetch(videoUrl, {
        method: 'PUT',
        body: videoFile,
        headers: { 'Content-Type': videoFile.type },
      });

      if (!videoPutRes.ok) {
        throw new Error('Failed to upload video binary to object storage.');
      }

      // 3. Upload thumbnail binary if it exists
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

      // 4. Complete upload on server
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

      // Reset and refresh
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

  if (loading && connections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-3" />
        <p className="text-sm text-gray-500 font-sans">Loading editor dashboard...</p>
      </div>
    );
  }

  const activeConnections = connections.filter((c) => c.status === 'ACTIVE');
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Filter assignments based on pipeline tab
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8 relative pb-28 font-sans">
      {/* Header Banner */}
      <div className="space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 border border-neutral-200/60 px-3 py-1 text-xs font-bold text-neutral-600">
          <Users className="h-3.5 w-3.5 text-neutral-500" />
          Dashboard
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-black">
          Editor Panel
        </h1>
        <p className="text-sm text-neutral-500 max-w-2xl leading-relaxed">
          Manage your client connections, review requests, download assets, and upload edited video versions.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm animate-fade-in">
          {error}
        </div>
      )}

      {/* Stats Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Connected Clients</span>
            <span className="text-3xl font-extrabold text-black block mt-1">{connections.length}</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-neutral-50 flex items-center justify-center text-neutral-400 border border-neutral-100">
            <Users className="h-5 w-5" />
          </div>
        </Card>

        <Card className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">New Requests</span>
            <span className="text-3xl font-extrabold text-black block mt-1">{newRequests.length}</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center border border-orange-100/60">
            <span className="font-extrabold text-sm">{newRequests.length}</span>
          </div>
        </Card>

        <Card className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Active Jobs</span>
            <span className="text-3xl font-extrabold text-black block mt-1">{activeAssignments.length}</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center border border-indigo-100/60">
            <span className="font-extrabold text-sm">{activeAssignments.length}</span>
          </div>
        </Card>

        <Card className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Availability Status</span>
            <span className="inline-flex items-center gap-1.5 mt-2">
              <span className={`h-2.5 w-2.5 rounded-full ${
                profile?.availability === 'AVAILABLE' ? 'bg-green-500 animate-pulse' :
                profile?.availability === 'BUSY' ? 'bg-amber-500' :
                'bg-neutral-300'
              }`} />
              <span className="font-extrabold text-sm capitalize text-black">
                {(profile?.availability || 'OFFLINE').toLowerCase()}
              </span>
            </span>
          </div>
        </Card>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Assignments Pipeline Column */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white overflow-hidden p-6">
            <h3 className="font-bold text-lg text-black border-b border-neutral-50 pb-3 mb-4">
              Assignments Pipeline
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
                      activePipelineTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
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
                <FileText className="h-8 w-8 text-gray-200 mx-auto" />
                <p className="font-semibold">No assignments in this stage.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {currentTabList.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="p-5 border border-gray-100 rounded-2xl space-y-4 hover:border-gray-200 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-base text-black">{assignment.video.title}</h4>
                        <p className="text-xs text-gray-400 font-semibold mt-0.5">
                          Client: {assignment.user.name || 'Client'} ({assignment.user.email})
                        </p>
                      </div>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                        assignment.status === 'PENDING' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                        assignment.status === 'ACCEPTED' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        assignment.status === 'IN_PROGRESS' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                        assignment.status === 'REVIEW' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                        assignment.status === 'REVISION_REQUESTED' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        {assignment.status}
                      </span>
                    </div>

                    {/* Original video download section */}
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-black/5 flex items-center justify-center text-gray-600">
                          <Play className="h-4 w-4" />
                        </div>
                        <div className="text-xs">
                          <p className="font-bold text-gray-800">Original Source Video</p>
                          <p className="text-gray-400 font-semibold">Download file to start editing</p>
                        </div>
                      </div>
                      <a
                        href={assignment.video.videoUrl}
                        download
                        className="inline-flex items-center gap-1 text-xs font-bold text-black border border-gray-250 bg-white hover:bg-neutral-50 px-3 py-1.5 rounded-xl transition-all"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </a>
                    </div>

                    {assignment.notes && (
                      <div className="text-xs font-semibold text-gray-500 bg-gray-50/50 border border-gray-100 rounded-xl p-3.5 whitespace-pre-line leading-relaxed">
                        <span className="font-bold text-black block mb-1">Client Instructions:</span>
                        {assignment.notes}
                      </div>
                    )}

                    {/* Action panel by stage */}
                    {assignment.status === 'PENDING' && (
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => handleDecline(assignment.id)}
                          disabled={updatingId === assignment.id}
                          className="flex-1 py-2 text-xs font-bold rounded-xl border border-red-100 text-red-600 bg-white hover:bg-red-50/50 transition-colors"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleAccept(assignment.id)}
                          disabled={updatingId === assignment.id}
                          className="flex-1 py-2 text-xs font-bold rounded-xl bg-black text-white hover:bg-neutral-800 transition-colors"
                        >
                          Accept Assignment
                        </button>
                      </div>
                    )}

                    {['ACCEPTED', 'IN_PROGRESS', 'REVISION_REQUESTED'].includes(assignment.status) && (
                      <div className="pt-3 border-t border-gray-50 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                          {/* Slider progress */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                              Work Progress: {editProgress[assignment.id] ?? 0}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="99" // cannot set to 100 manually; 100 happens when file is uploaded
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
                              className="w-full border border-gray-200 rounded-xl p-2 text-xs font-bold text-gray-600 focus:outline-hidden cursor-pointer bg-white"
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
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl border border-gray-250 text-gray-700 bg-white hover:bg-neutral-50 transition-colors cursor-pointer"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            Update Status/ETA
                          </button>
                          <button
                            onClick={() => {
                              setUploadingAssignment(assignment);
                              setUploadError(null);
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl bg-black text-white hover:bg-neutral-800 transition-colors shadow-xs cursor-pointer"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            Upload Edited Version
                          </button>
                        </div>
                      </div>
                    )}

                    {assignment.status === 'REVIEW' && (
                      <div className="pt-3 border-t border-gray-50 space-y-2">
                        <p className="text-xs text-gray-400 font-bold flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 text-purple-500 animate-spin" />
                          Upload sent. Awaiting client review and approval.
                        </p>
                        {assignment.editedVideos.length > 0 && (
                          <div className="text-[11px] text-gray-500 font-semibold">
                            Uploaded Drafts: {assignment.editedVideos.map((ed) => `v${ed.version}`).join(', ')}
                          </div>
                        )}
                      </div>
                    )}

                    {['APPROVED', 'COMPLETED'].includes(assignment.status) && (
                      <div className="pt-3 border-t border-gray-50">
                        <p className="text-xs text-emerald-600 font-bold flex items-center gap-1.5">
                          <Check className="h-4 w-4 bg-emerald-500 text-white rounded-full p-0.5" />
                          Assignment approved. Great work!
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Connections & Inbox sidebar column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Active clients */}
          <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white overflow-hidden p-6">
            <h3 className="font-bold text-base text-black border-b border-neutral-50 pb-3 mb-4">
              My Active Clients
            </h3>
            {activeConnections.length === 0 ? (
              <div className="py-6 text-center text-gray-400 text-xs font-medium">
                No active connections. Share your editor key to start.
              </div>
            ) : (
              <div className="space-y-3">
                {activeConnections.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border-b border-gray-50 pb-2.5 last:border-b-0 last:pb-0">
                    <div className="text-xs">
                      <p className="font-bold text-black">{c.user?.name || 'N/A'}</p>
                      <p className="text-gray-400 font-semibold">{c.user?.email}</p>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Notifications Inbox */}
          <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white overflow-hidden p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-50 pb-3">
              <h3 className="font-bold text-base text-black flex items-center gap-2">
                <Bell className="h-4.5 w-4.5 text-neutral-500" />
                Inbox
                {unreadCount > 0 && (
                  <span className="bg-neutral-900 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold">
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

            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-neutral-400 text-xs font-medium">
                  Inbox is empty.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      n.read
                        ? 'bg-neutral-50/50 border-neutral-100 text-neutral-500'
                        : 'bg-white border-neutral-200 text-black shadow-xs font-medium'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold">{n.title}</span>
                      <span className="text-[10px] text-neutral-400">
                        {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="leading-relaxed text-neutral-600">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Upload Edited Version Overlay Modal */}
      {uploadingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => !uploadLoading && setUploadingAssignment(null)} />
          <div className="relative bg-white rounded-3xl border border-gray-100 shadow-2xl p-6 z-50 w-full max-w-md space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-black font-sans">Upload Edited Draft</h3>
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
