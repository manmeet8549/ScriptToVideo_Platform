'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileText, Play, Download, Clock, Upload, Check, Loader2, AlertCircle 
} from 'lucide-react';

interface EditedVideo {
  id: string;
  version: number;
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
    title: string;
    videoUrl: string;
  };
  user: {
    name: string | null;
    email: string;
  };
  editedVideos: EditedVideo[];
}

export default function EditorAssignmentsPage() {
  const [assignments, setAssignments] = useState<VideoAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editProgress, setEditProgress] = useState<Record<string, number>>({});
  const [editEta, setEditEta] = useState<Record<string, string>>({});

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/assignments/editor');
      if (res.ok) {
        const data = await res.json();
        const list = data.assignments || [];
        setAssignments(list);

        const progressMap: Record<string, number> = {};
        const etaMap: Record<string, string> = {};
        list.forEach((a: VideoAssignment) => {
          progressMap[a.id] = a.progress;
          etaMap[a.id] = a.estimatedHours ? String(a.estimatedHours) : '';
        });
        setEditProgress(progressMap);
        setEditEta(etaMap);
      } else {
        setError('Failed to fetch assignments.');
      }
    } catch {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleAccept = async (assignmentId: string) => {
    setUpdatingId(assignmentId);
    try {
      const res = await fetch('/api/assignments/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      });
      if (res.ok) {
        await fetchAssignments();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to accept assignment.');
      }
    } catch {
      alert('Network failure.');
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
        await fetchAssignments();
        alert('Progress updated!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update progress.');
      }
    } catch {
      alert('Network error.');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-3" />
        <p className="text-xs text-gray-500">Loading assignments list...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 font-sans">
          Assigned Projects
        </h1>
        <p className="text-sm text-gray-500 font-medium">
          Manage, accept, and track editing assignments requested by clients.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      {assignments.length === 0 ? (
        <Card className="rounded-3xl border border-gray-100 bg-white p-12 text-center text-gray-400 font-sans">
          <FileText className="h-8 w-8 text-gray-200 mx-auto mb-3" />
          <p className="font-bold">No active or pending assignments found.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs">
              <CardContent className="p-0 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-lg text-black">{assignment.video.title}</h3>
                    <p className="text-xs text-gray-400 font-semibold mt-0.5">
                      Requested by: {assignment.user.name || 'Client'} ({assignment.user.email})
                    </p>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                    assignment.status === 'PENDING' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                    ['ACCEPTED', 'IN_PROGRESS', 'REVISION_REQUESTED'].includes(assignment.status) ? 'bg-blue-50 text-blue-700 border-blue-100' :
                    assignment.status === 'REVIEW' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                    'bg-emerald-50 text-emerald-700 border-emerald-100'
                  }`}>
                    {assignment.status}
                  </span>
                </div>

                <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Play className="h-5 w-5 text-gray-400" />
                    <div className="text-xs">
                      <p className="font-bold text-gray-800">Original Source Video</p>
                      <p className="text-gray-400 font-semibold">Download to begin editing</p>
                    </div>
                  </div>
                  <a
                    href={assignment.video.videoUrl}
                    download
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-black border border-gray-250 bg-white hover:bg-neutral-50 px-3.5 py-2 rounded-xl transition-all"
                  >
                    <Download className="h-4 w-4" />
                    Download File
                  </a>
                </div>

                {assignment.notes && (
                  <div className="text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-100 rounded-xl p-4 leading-relaxed">
                    <span className="font-bold text-black block mb-1">Client Notes:</span>
                    {assignment.notes}
                  </div>
                )}

                {assignment.status === 'PENDING' ? (
                  <div className="pt-2">
                    <button
                      onClick={() => handleAccept(assignment.id)}
                      disabled={updatingId === assignment.id}
                      className="w-full py-2.5 text-xs font-bold rounded-xl bg-black text-white hover:bg-neutral-800 transition-all flex items-center justify-center gap-1.5"
                    >
                      {updatingId === assignment.id && <Loader2 className="h-4 w-4 animate-spin" />}
                      Accept Assignment
                    </button>
                  </div>
                ) : ['ACCEPTED', 'IN_PROGRESS', 'REVISION_REQUESTED'].includes(assignment.status) ? (
                  <div className="pt-3 border-t border-gray-50 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                          Progress: {editProgress[assignment.id] ?? 0}%
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
                          className="w-full border border-gray-200 rounded-xl p-2 text-xs font-bold text-gray-600 focus:outline-hidden bg-white"
                        >
                          <option value="">No ETA set</option>
                          <option value="6">6 Hours</option>
                          <option value="12">12 Hours</option>
                          <option value="24">24 Hours (1 Day)</option>
                          <option value="48">48 Hours (2 Days)</option>
                          <option value="72">72 Hours (3 Days)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={() => handleUpdateProgress(assignment.id)}
                      disabled={updatingId === assignment.id}
                      className="w-full py-2.5 text-xs font-bold rounded-xl border border-gray-250 text-gray-700 bg-white hover:bg-neutral-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {updatingId === assignment.id && <Loader2 className="h-4 w-4 animate-spin" />}
                      Update Progress & ETA
                    </button>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-gray-50 text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                    <Check className="h-4 w-4 bg-emerald-500 text-white rounded-full p-0.5" />
                    Project successfully processed.
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
