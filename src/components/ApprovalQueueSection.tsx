import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckSquare, Check, X, Edit, MessageSquare, Video, Loader2, Info, User, Clock, Play
} from 'lucide-react';

interface ApprovalItem {
  id: string;
  videoId: string;
  status: string;
  requestedDate: string;
  video: {
    id: string;
    title: string;
    videoUrl: string;
    thumbnailUrl?: string | null;
  };
  user: {
    name?: string | null;
    email: string;
  };
}

export default function ApprovalQueueSection() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});

  // Fetch approvals
  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/publish/approvals');
      if (res.ok) {
        const data = await res.json();
        setApprovals(data.approvals || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  // Action (Approve / Reject / Changes)
  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED') => {
    const feedback = feedbackText[id] || '';
    setActioningId(id);
    try {
      const res = await fetch(`/api/publish/approvals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, feedback })
      });
      if (res.ok) {
        alert(`Approval request updated: ${status}`);
        setFeedbackText(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        fetchApprovals();
      } else {
        alert('Failed to update approval request.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating approval.');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-1 text-xs font-sans">
      {/* Title Header */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-black flex items-center gap-3">
          Approval Queue
        </h1>
        <p className="text-sm text-gray-500 font-sans mt-1">
          Review, approve, reject, or request changes on video publications from workspace creators.
        </p>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-indigo-50/20 border border-indigo-100 rounded-3xl flex items-start gap-2.5">
        <Info className="h-4.5 w-4.5 text-indigo-600 mt-0.5" />
        <div>
          <span className="font-extrabold text-indigo-950 block mb-0.5">Publishing Control Active</span>
          When "Approval Required" is enabled, all platform publication schedules stay locked in a review holding state until authorized by an administrator.
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          </div>
        ) : approvals.length > 0 ? (
          approvals.map((req) => (
            <Card key={req.id} className="rounded-3xl border border-gray-150 bg-white p-5 shadow-xs flex flex-col justify-between h-[420px]">
              <CardContent className="p-0 space-y-4 flex flex-col justify-between h-full">
                
                {/* Header Creator Info */}
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Pending Review</span>
                    <h4 className="font-extrabold text-sm text-black pt-1 truncate max-w-[200px]" title={req.video.title}>{req.video.title}</h4>
                  </div>
                </div>

                {/* Video Preview Block */}
                <div className="h-40 rounded-2xl bg-neutral-100 overflow-hidden relative border flex items-center justify-center">
                  {req.video.thumbnailUrl ? (
                    <Image src={req.video.thumbnailUrl} className="object-cover h-full w-full" alt="Video thumbnail" fill unoptimized />
                  ) : (
                    <Video className="h-8 w-8 text-neutral-400" />
                  )}
                  <a
                    href={req.video.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-0 bg-black/10 hover:bg-black/30 flex items-center justify-center transition-colors group cursor-pointer"
                  >
                    <div className="h-10 w-10 rounded-full bg-white/90 shadow-md flex items-center justify-center text-black group-hover:scale-110 transition-transform">
                      <Play className="h-4.5 w-4.5 fill-current ml-0.5" />
                    </div>
                  </a>
                </div>

                {/* Request Details */}
                <div className="space-y-1 text-[11px] font-semibold text-gray-500 font-sans border-b pb-2">
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> Requested By</span>
                    <span className="text-black font-bold">{req.user.name || req.user.email}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Requested Date</span>
                    <span className="text-black font-bold">{new Date(req.requestedDate).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Feedback Comment Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Feedback or instructions..."
                    value={feedbackText[req.id] || ''}
                    onChange={(e) => setFeedbackText(prev => ({ ...prev, [req.id]: e.target.value }))}
                    className="w-full bg-neutral-50 border border-gray-150 rounded-xl pl-3 pr-8 py-2 text-[10px] font-semibold text-gray-700"
                  />
                  <MessageSquare className="h-3.5 w-3.5 text-gray-400 absolute right-3 top-2.5" />
                </div>

                {/* Decision Actions Button Bar */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleAction(req.id, 'APPROVED')}
                    disabled={actioningId !== null}
                    className="w-full rounded-xl bg-black text-white hover:bg-neutral-800 text-[10px] py-2 font-bold cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                  >
                    <Check className="h-3 w-3" /> Approve
                  </Button>
                  <Button
                    onClick={() => handleAction(req.id, 'CHANGES_REQUESTED')}
                    disabled={actioningId !== null}
                    className="w-full rounded-xl border border-gray-150 bg-white hover:bg-neutral-50 text-[10px] py-2 font-bold text-gray-600 cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Edit className="h-3 w-3" /> Changes
                  </Button>
                  <Button
                    onClick={() => handleAction(req.id, 'REJECTED')}
                    disabled={actioningId !== null}
                    className="rounded-xl border border-red-100 bg-red-50 hover:bg-red-100 text-[10px] py-2 px-3 font-bold text-red-600 cursor-pointer flex items-center justify-center gap-1"
                  >
                    <X className="h-3 w-3" /> Reject
                  </Button>
                </div>

              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-16 text-center border border-dashed border-gray-150 rounded-3xl bg-neutral-50/20">
            <CheckSquare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <h4 className="font-extrabold text-sm text-neutral-800">Clear queue!</h4>
            <p className="text-gray-400 font-semibold mt-1">There are no pending publishing approvals to review.</p>
          </div>
        )}
      </div>
    </div>
  );
}
