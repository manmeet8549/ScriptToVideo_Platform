'use client';

import { useState, useEffect } from 'react';
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

interface ConnectionItem {
  id: string;
  userId: string;
  editorId: string;
  status: string;
  editor: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState<VideoAssignment[]>([]);
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Track open notes detail
  const [viewingNotes, setViewingNotes] = useState<{ title: string; notes: string | null } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [assignmentsRes, connectionsRes] = await Promise.all([
        fetch('/api/admin/assignments'),
        fetch('/api/admin/connections')
      ]);

      if (assignmentsRes.ok && connectionsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        const connectionsData = await connectionsRes.json();
        setAssignments(assignmentsData.assignments || []);
        setConnections(connectionsData.connections || []);
      } else {
        setError('Failed to load system data.');
      }
    } catch {
      setError('An error occurred while fetching dashboard information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (id: string, action: 'CANCEL' | 'REASSIGN', editorId?: string) => {
    setError('');
    try {
      const res = await fetch(`/api/admin/assignments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, editorId }),
      });

      const data = await res.json();
      if (res.ok) {
        fetchData();
      } else {
        setError(data.error || 'Action failed.');
      }
    } catch {
      setError('An error occurred while processing the command.');
    }
  };

  // Get status pill style
  const getStatusBadge = (status: VideoAssignment['status']) => {
    const styles: Record<VideoAssignment['status'], string> = {
      PENDING: 'bg-orange-50 text-orange-700 border-orange-100',
      ACCEPTED: 'bg-blue-50 text-blue-700 border-blue-100',
      IN_PROGRESS: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      REVIEW: 'bg-purple-50 text-purple-700 border-purple-100',
      REVISION_REQUESTED: 'bg-amber-50 text-amber-700 border-amber-100',
      COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      REJECTED: 'bg-red-50 text-red-700 border-red-100',
    };
    return styles[status] || 'bg-gray-50 text-gray-700 border-gray-100';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-black">Assignment Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage video assignments, track pipelines, and reassign editors.</p>
        </div>
        <div className="flex gap-4">
          <Link href="/admin/users" className="text-sm font-bold text-gray-600 hover:text-black">
            Manage Users
          </Link>
          <Link href="/admin/connections" className="text-sm font-bold text-gray-600 hover:text-black">
            Manage Connections
          </Link>
          <Link href="/admin/editors" className="text-sm font-bold text-gray-600 hover:text-black">
            Manage Editors &rarr;
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Assignments Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">No assignments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold text-xs uppercase tracking-wider">
                  <th className="p-4">Video & Client</th>
                  <th className="p-4">Assigned Editor</th>
                  <th className="p-4">Status & ETA</th>
                  <th className="p-4">Progress</th>
                  <th className="p-4">Reassign Editor</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assignments.map((a) => {
                  // Find all active editors connected to this client/user
                  const clientConnections = connections.filter(
                    (conn) => conn.userId === a.userId && conn.status === 'ACTIVE' && conn.editorId !== a.editorId
                  );

                  return (
                    <tr key={a.id} className="hover:bg-gray-50/50">
                      <td className="p-4 space-y-1">
                        <p className="font-bold text-black max-w-[220px] truncate" title={a.video.title}>
                          {a.video.title}
                        </p>
                        <p className="text-[11px] text-gray-400 font-semibold truncate">
                          Client: {a.user.name || 'Client'} ({a.user.email})
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-gray-800">{a.editor.name || 'Editor'}</p>
                        <p className="text-[11px] text-gray-400 font-semibold">{a.editor.email}</p>
                      </td>
                      <td className="p-4 space-y-1.5">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(a.status)}`}>
                          {a.status}
                        </span>
                        {a.estimatedHours && (
                          <p className="text-[11px] text-gray-400 font-bold">
                            ETA: {a.estimatedHours} hours
                          </p>
                        )}
                      </td>
                      <td className="p-4 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-gray-700">{a.progress}%</span>
                        </div>
                        <div className="w-24 bg-gray-100 rounded-full h-1 overflow-hidden">
                          <div
                            className="bg-black h-1 rounded-full"
                            style={{ width: `${a.progress}%` }}
                          />
                        </div>
                      </td>
                      <td className="p-4">
                        {clientConnections.length > 0 && !['APPROVED', 'REJECTED'].includes(a.status) ? (
                          <select
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                if (confirm(`Reassign this video to ${e.target.options[e.target.selectedIndex].text}?`)) {
                                  handleAction(a.id, 'REASSIGN', val);
                                }
                                e.target.value = ''; // Reset select
                              }
                            }}
                            className="text-xs font-semibold bg-white border border-gray-200 rounded-lg p-1.5 focus:outline-none focus:border-black cursor-pointer max-w-[180px]"
                            defaultValue=""
                          >
                            <option value="" disabled>Select editor...</option>
                            {clientConnections.map((conn) => (
                              <option key={conn.id} value={conn.editorId}>
                                {conn.editor.name || conn.editor.email}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-gray-400 italic font-semibold">
                            {['APPROVED', 'REJECTED'].includes(a.status) ? 'Finished' : 'No alternative editors'}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-3">
                        <button
                          onClick={() => setViewingNotes({ title: a.video.title, notes: a.notes })}
                          className="text-gray-600 hover:text-black hover:underline text-xs font-bold"
                        >
                          Notes
                        </button>
                        {!['APPROVED', 'REJECTED'].includes(a.status) && (
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to cancel this video assignment? This will reject the assignment.')) {
                                handleAction(a.id, 'CANCEL');
                              }
                            }}
                            className="text-red-500 hover:text-red-700 hover:underline text-xs font-bold"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notes Detail Modal Overlay */}
      {viewingNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-xs" onClick={() => setViewingNotes(null)} />
          <div className="relative bg-white rounded-3xl p-6 border border-gray-100 shadow-2xl z-50 w-full max-w-lg space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-black font-sans">Assignment logs & notes</h3>
                <p className="text-xs text-gray-500 truncate max-w-[320px]">{viewingNotes.title}</p>
              </div>
              <button
                onClick={() => setViewingNotes(null)}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-black transition-colors"
              >
                &times;
              </button>
            </div>
            <div className="whitespace-pre-line text-xs text-gray-600 leading-relaxed font-sans bg-gray-50 p-4 rounded-2xl max-h-[300px] overflow-y-auto border border-gray-100">
              {viewingNotes.notes || 'No notes available for this assignment.'}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingNotes(null)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-black text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
