import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Check, X, Loader2, ArrowLeft, Download, 
  Clock, User, MessageSquare, AlertCircle, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

export default function AssignmentsSection() {
  const queryClient = useQueryClient();
  const [selectedAssignment, setSelectedAssignment] = useState<VideoAssignment | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [isRevisionOpen, setIsRevisionOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  
  // Track selected version in detail view (defaulting to the latest version)
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);

  // Fetch user assignments
  const { data, isLoading, error } = useQuery<{ assignments: VideoAssignment[] }>({
    queryKey: ['user-assignments'],
    queryFn: async () => {
      const res = await fetch('/api/assignments/user');
      if (!res.ok) throw new Error('Failed to fetch assignments');
      return res.json();
    },
  });

  const assignments = data?.assignments ?? [];

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const res = await fetch('/api/assignments/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to approve assignment');
      return resData;
    },
    onSuccess: (_, assignmentId) => {
      queryClient.invalidateQueries({ queryKey: ['user-assignments'] });
      // Update local state if viewing details
      if (selectedAssignment?.id === assignmentId) {
        setSelectedAssignment((prev) => prev ? { ...prev, status: 'APPROVED' as const } : null);
      }
      setActionError(null);
    },
    onError: (err: Error) => {
      setActionError(err.message);
    },
  });

  // Revision mutation
  const revisionMutation = useMutation({
    mutationFn: async (payload: { assignmentId: string; notes: string }) => {
      const res = await fetch('/api/assignments/revision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to submit revision');
      return resData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-assignments'] });
      if (selectedAssignment?.id === data.assignment?.id) {
        setSelectedAssignment(data.assignment);
      }
      setRevisionNotes('');
      setIsRevisionOpen(false);
      setActionError(null);
    },
    onError: (err: Error) => {
      setActionError(err.message);
    },
  });

  // Get status pill style
  const getStatusBadge = (status: VideoAssignment['status']) => {
    const styles: Record<VideoAssignment['status'], string> = {
      PENDING: 'bg-orange-50 text-orange-700 border-orange-100',
      ACCEPTED: 'bg-blue-50 text-blue-700 border-blue-100',
      IN_PROGRESS: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      REVIEW: 'bg-purple-50 text-purple-700 border-purple-100 animate-pulse',
      REVISION_REQUESTED: 'bg-amber-50 text-amber-700 border-amber-100',
      COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      REJECTED: 'bg-red-50 text-red-700 border-red-100',
    };
    return styles[status] || 'bg-gray-50 text-gray-700 border-gray-100';
  };

  const activeAssignmentDetail = selectedAssignment 
    ? assignments.find((a) => a.id === selectedAssignment.id) || selectedAssignment
    : null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-1">
      {/* Header Banner */}
      {!activeAssignmentDetail && (
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold font-sans tracking-tight text-black">
            Video Assignments
          </h1>
          <p className="text-base text-gray-500 font-sans max-w-xl leading-relaxed">
            Monitor editing progress, review drafts uploaded by your connected editors, request revisions, or approve finalized videos.
          </p>
        </div>
      )}

      {/* Detail View Container */}
      {activeAssignmentDetail ? (
        <div className="space-y-6">
          {/* Back button */}
          <button
            onClick={() => {
              setSelectedAssignment(null);
              setSelectedVersionIndex(0);
              setActionError(null);
            }}
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-black transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to assignments
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Video Players */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden p-6 shadow-xs">
                <h3 className="text-lg font-bold text-black mb-4 font-sans">
                  {activeAssignmentDetail.video.title}
                </h3>

                {/* Video Comparison Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Original Video */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">
                      Original Video
                    </span>
                    <div className="aspect-video bg-neutral-950 rounded-2xl overflow-hidden relative border border-neutral-800">
                      <video
                        src={activeAssignmentDetail.video.videoUrl}
                        controls
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <a
                      href={activeAssignmentDetail.video.videoUrl}
                      download
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-black transition-colors"
                    >
                      <Download className="h-3 w-3" />
                      Download Original
                    </a>
                  </div>

                  {/* Edited Video */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">
                        Edited Draft
                      </span>
                      {activeAssignmentDetail.editedVideos.length > 1 && (
                        <select
                          value={selectedVersionIndex}
                          onChange={(e) => setSelectedVersionIndex(parseInt(e.target.value, 10))}
                          className="bg-gray-50 border border-gray-150 rounded-xl px-2.5 py-1 text-xs font-bold text-gray-600 focus:outline-hidden cursor-pointer"
                        >
                          {activeAssignmentDetail.editedVideos.map((ed, idx) => (
                            <option key={ed.id} value={idx}>
                              Version {ed.version} (v{ed.version})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="aspect-video bg-neutral-950 rounded-2xl overflow-hidden relative border border-neutral-800 flex items-center justify-center">
                      {activeAssignmentDetail.editedVideos.length > 0 ? (
                        <video
                          src={activeAssignmentDetail.editedVideos[selectedVersionIndex]?.editedVideoUrl}
                          controls
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-center p-6 space-y-2">
                          <AlertCircle className="h-6 w-6 text-gray-300 mx-auto" />
                          <p className="text-xs font-bold text-gray-400">No edits uploaded yet</p>
                          <p className="text-[10px] text-gray-400 max-w-[180px] mx-auto">
                            The editor is currently working on your video.
                          </p>
                        </div>
                      )}
                    </div>

                    {activeAssignmentDetail.editedVideos.length > 0 && (
                      <a
                        href={activeAssignmentDetail.editedVideos[selectedVersionIndex]?.editedVideoUrl}
                        download
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-black transition-colors"
                      >
                        <Download className="h-3 w-3" />
                        Download Edited Draft
                      </a>
                    )}
                  </div>
                </div>

                {/* Review Controls (when in REVIEW state) */}
                {activeAssignmentDetail.status === 'REVIEW' && (
                  <div className="mt-8 pt-6 border-t border-gray-50 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setIsRevisionOpen(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-amber-200 text-amber-800 hover:bg-amber-50 font-bold text-xs transition-colors cursor-pointer"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Request Revision
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to approve this video? This will set this version as your primary project video and complete the assignment.')) {
                          approveMutation.mutate(activeAssignmentDetail.id);
                        }
                      }}
                      disabled={approveMutation.isPending}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-black text-white hover:bg-neutral-800 font-bold text-xs transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Approve & Set as Main Video
                    </button>
                  </div>
                )}

                {/* Action feedback/error */}
                {actionError && (
                  <div className="mt-4 p-3 bg-red-50 text-red-500 rounded-xl text-xs font-semibold border border-red-100">
                    {actionError}
                  </div>
                )}
              </div>

              {/* Revision form dropdown */}
              <AnimatePresence>
                {isRevisionOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-amber-50/30 rounded-3xl border border-amber-100 p-6 overflow-hidden space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold text-amber-900 font-sans">Submit Revision Request</h4>
                      <button
                        onClick={() => setIsRevisionOpen(false)}
                        className="text-gray-400 hover:text-black"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <textarea
                      value={revisionNotes}
                      onChange={(e) => setRevisionNotes(e.target.value)}
                      placeholder="List specific changes you want the editor to make (e.g. cut at 0:15, add subtitle style, adjust background music)..."
                      rows={3}
                      className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-2xl text-sm font-semibold placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setIsRevisionOpen(false)}
                        className="px-4 py-2 text-xs font-bold rounded-xl border border-gray-250 text-gray-600 bg-white hover:bg-neutral-50 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (!revisionNotes.trim()) return;
                          revisionMutation.mutate({
                            assignmentId: activeAssignmentDetail.id,
                            notes: revisionNotes,
                          });
                        }}
                        disabled={revisionMutation.isPending || !revisionNotes.trim()}
                        className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {revisionMutation.isPending ? 'Submitting...' : 'Submit Request'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Column: Timeline & Notes Log */}
            <div className="space-y-6">
              {/* Assignment Meta Details */}
              <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider block border-b border-gray-50 pb-2">
                  Assignment Status
                </h4>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400 font-semibold">Current State</span>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getStatusBadge(activeAssignmentDetail.status)}`}>
                    {activeAssignmentDetail.status}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-gray-500">
                    <span>Progress</span>
                    <span>{activeAssignmentDetail.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-black h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${activeAssignmentDetail.progress}%` }}
                    />
                  </div>
                </div>

                {activeAssignmentDetail.estimatedHours && (
                  <div className="flex justify-between items-center text-xs font-semibold text-gray-500 pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span>Estimated ETA</span>
                    </div>
                    <span>{activeAssignmentDetail.estimatedHours} hours</span>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                  <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-gray-600">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-black">Editor: {activeAssignmentDetail.editor.name || 'Connected Editor'}</p>
                    <p className="text-gray-400 font-semibold">{activeAssignmentDetail.editor.email}</p>
                  </div>
                </div>
              </div>

              {/* Assignment Notes Logs */}
              <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider block border-b border-gray-50 pb-2">
                  Activity & Feedback Logs
                </h4>
                <div className="max-h-[350px] overflow-y-auto pr-1 space-y-4">
                  {activeAssignmentDetail.notes ? (
                    <div className="whitespace-pre-line text-xs font-medium text-gray-600 leading-relaxed font-sans bg-gray-50/50 border border-gray-100 p-4 rounded-2xl">
                      {activeAssignmentDetail.notes}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center font-semibold py-4">No logged activity comments.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Grid List View */
        <>
          {isLoading && (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 text-black animate-spin" />
              <p className="text-sm font-semibold text-gray-500">Loading your video assignments...</p>
            </div>
          )}

          {error && (
            <div className="py-20 text-center">
              <p className="text-red-500 font-semibold">Failed to load assignments: {(error as Error).message}</p>
            </div>
          )}

          {!isLoading && !error && assignments.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/20">
              <FileText className="h-10 w-10 text-gray-300 mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 text-lg">No assignments found</h3>
              <p className="text-sm text-gray-400 max-w-xs mx-auto mt-1 font-semibold">
                Send a completed video to an editor from the Video Library to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  onClick={() => setSelectedAssignment(assignment)}
                  className="group bg-white rounded-3xl border border-gray-100 p-5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4 cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getStatusBadge(assignment.status)}`}>
                        {assignment.status}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold">
                        {new Date(assignment.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-black truncate group-hover:text-neutral-900 transition-colors">
                        {assignment.video.title}
                      </h4>
                      <p className="text-xs text-gray-400 font-semibold truncate">
                        Editor: {assignment.editor.name || assignment.editor.email}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-gray-50">
                    <div className="flex justify-between text-[11px] font-semibold text-gray-500">
                      <span>Progress</span>
                      <span>{assignment.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1">
                      <div
                        className="bg-black h-1 rounded-full transition-all duration-300"
                        style={{ width: `${assignment.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-semibold pt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{assignment.estimatedHours ? `${assignment.estimatedHours}h ETA` : 'No ETA set'}</span>
                    </div>
                    <span className="text-black font-bold group-hover:underline">Review &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
