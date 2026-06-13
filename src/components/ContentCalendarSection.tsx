import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Plus,
  Video, Loader2, Play, Info, AlertCircle, CheckCircle2
} from 'lucide-react';
import { useSession } from 'next-auth/react';

// Custom social brand SVG icons
const Youtube = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.522 3.5 12 3.5 12 3.5s-7.522 0-9.388.555A3.002 3.002 0 0 0 .503 6.163C0 8.03 0 12 0 12s0 3.97.503 5.837a3.003 3.003 0 0 0 2.11 2.108C5.113 20.5 12 20.5 12 20.5s7.522 0 9.388-.555a3.003 3.003 0 0 0 2.11-2.108C24 15.97 24 12 24 12s0-3.97-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const Linkedin = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const Facebook = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const Instagram = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

const Twitter = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

interface ScheduledPost {
  id: string;
  videoId: string;
  platform: string;
  scheduledFor: string;
  status: string;
  publishedAt?: string | null;
  errorMessage?: string | null;
  video: {
    title: string;
    videoUrl: string;
    thumbnailUrl?: string | null;
    duration?: number | null;
  };
  campaign?: {
    name: string;
  } | null;
}

interface VideoItem {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
}

export default function ContentCalendarSection() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  
  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [schedulePlatform, setSchedulePlatform] = useState('youtube');
  const [scheduling, setScheduling] = useState(false);
  const [runningAgent, setRunningAgent] = useState(false);

  // Social account selections (just default Youtube for scheduling)
  const [accounts, setAccounts] = useState<any[]>([]);

  // Fetch Scheduled Posts
  const { data: scheduleData, refetch: refetchSchedule } = useQuery<{ scheduledPosts: ScheduledPost[] }>({
    queryKey: ['scheduledPosts'],
    queryFn: async () => {
      const res = await fetch('/api/publish/schedule');
      if (!res.ok) throw new Error('Failed to fetch schedule');
      return res.json();
    },
  });
  const scheduledPosts = scheduleData?.scheduledPosts ?? [];

  // Fetch Videos
  const { data: videosData } = useQuery<{ videos: VideoItem[] }>({
    queryKey: ['videos'],
    queryFn: async () => {
      const res = await fetch('/api/videos');
      if (!res.ok) throw new Error('Failed to fetch videos');
      return res.json();
    },
  });
  const videos = videosData?.videos ?? [];

  // Fetch connected channels
  useEffect(() => {
    fetch('/api/publish/accounts')
      .then(res => res.json())
      .then(data => setAccounts(data.accounts || []))
      .catch(err => console.error(err));
  }, []);

  // Format date helper
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Run Agent Cycle Mutation
  const handleRunAgentCycle = async () => {
    setRunningAgent(true);
    try {
      const res = await fetch('/api/cron/publish', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert(`Agent cycle completed! Processed ${data.processedCount} post(s).`);
        refetchSchedule();
        queryClient.invalidateQueries({ queryKey: ['publishedVideos'] });
        queryClient.invalidateQueries({ queryKey: ['videos'] });
      } else {
        alert('Agent failed to complete cycle.');
      }
    } catch (err) {
      console.error(err);
      alert('Error triggering agent.');
    } finally {
      setRunningAgent(false);
    }
  };

  // Submit schedule
  const handleSchedulePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVideoId || !scheduleDate || !scheduleTime) {
      alert('Please fill in all fields.');
      return;
    }

    setScheduling(true);
    try {
      const targetAccount = accounts.find(a => a.platform === schedulePlatform);
      const socialAccountId = targetAccount?.id || 'simulated';

      const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}:00`);

      const res = await fetch('/api/publish/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: selectedVideoId,
          scheduledFor: scheduledFor.toISOString(),
          targets: [
            {
              socialAccountId,
              platform: schedulePlatform,
              title: videos.find(v => v.id === selectedVideoId)?.title || 'Untitled Scheduled',
              description: 'AI content scheduled post',
            }
          ]
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Post scheduled!');
        setIsScheduleModalOpen(false);
        refetchSchedule();
      } else {
        alert(data.error || 'Failed to schedule post');
      }
    } catch (err) {
      console.error(err);
      alert('Error scheduling post');
    } finally {
      setScheduling(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled post?')) return;

    try {
      const res = await fetch(`/api/publish/schedule?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('Post cancelled.');
        refetchSchedule();
      } else {
        alert('Failed to cancel.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Icon Match Helpers
  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'youtube': return <Youtube className="h-3.5 w-3.5 text-red-600" />;
      case 'linkedin': return <Linkedin className="h-3.5 w-3.5 text-blue-600" />;
      case 'facebook': return <Facebook className="h-3.5 w-3.5 text-indigo-600" />;
      case 'instagram': return <Instagram className="h-3.5 w-3.5 text-pink-500" />;
      case 'twitter': return <Twitter className="h-3.5 w-3.5 text-black" />;
      default: return <Video className="h-3.5 w-3.5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-emerald-50 border-emerald-250 text-emerald-700';
      case 'PENDING_APPROVAL': return 'bg-amber-50 border-amber-250 text-amber-700';
      case 'FAILED': return 'bg-rose-50 border-rose-250 text-rose-700';
      default: return 'bg-blue-50 border-blue-250 text-blue-700';
    }
  };

  // Month Grid Calculation
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const gridCells = [...blanks, ...days];

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-1">
      {/* Title Header */}
      <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-black flex items-center gap-3">
            Content Calendar
          </h1>
          <p className="text-sm text-gray-500 font-sans mt-1">
            Plan, organize, approve, and track your multi-platform scheduled publications.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleRunAgentCycle}
            disabled={runningAgent}
            className="rounded-xl border border-gray-200 bg-white hover:bg-neutral-50 text-xs font-bold text-gray-700 px-4 py-2 cursor-pointer flex items-center gap-2"
          >
            {runningAgent ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Run Agent Cycle
          </Button>
          <Button
            onClick={() => setIsScheduleModalOpen(true)}
            className="rounded-xl bg-black text-white hover:bg-neutral-800 text-xs font-bold px-4 py-2 cursor-pointer flex items-center gap-2 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Schedule Video
          </Button>
        </div>
      </div>

      {/* Calendar View Area */}
      <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        {/* Controls */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black font-sans text-neutral-900">
              {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center border border-gray-150 rounded-xl overflow-hidden shadow-2xs">
              <button onClick={prevMonth} className="p-2 bg-white hover:bg-neutral-50 border-r border-gray-150 transition-colors cursor-pointer">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={nextMonth} className="p-2 bg-white hover:bg-neutral-50 transition-colors cursor-pointer">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex border border-gray-150 rounded-xl overflow-hidden shadow-2xs bg-white text-xs font-bold">
            {(['month', 'week', 'day'] as const).map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-4 py-2 transition-all cursor-pointer border-r last:border-0 border-gray-150 ${viewMode === m ? 'bg-black text-white' : 'bg-white text-gray-500 hover:text-black hover:bg-neutral-50'}`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Month Grid View */}
        {viewMode === 'month' && (
          <div className="grid grid-cols-7 gap-1 border-t border-l border-gray-100 rounded-2xl overflow-hidden shadow-2xs">
            {/* Day labels */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="bg-neutral-50 py-3 text-center text-xs font-extrabold text-gray-400 uppercase tracking-wider border-r border-b border-gray-100">
                {d}
              </div>
            ))}

            {gridCells.map((dayNum, idx) => {
              if (dayNum === null) {
                return <div key={`blank-${idx}`} className="bg-gray-50/10 h-32 border-r border-b border-gray-100" />;
              }

              // Find posts scheduled for this day
              const dayPosts = scheduledPosts.filter(p => {
                const d = new Date(p.scheduledFor);
                return d.getDate() === dayNum && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
              });

              const isToday = new Date().getDate() === dayNum && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();

              return (
                <div key={`day-${dayNum}`} className={`h-32 p-2 border-r border-b border-gray-100 flex flex-col justify-between relative group hover:bg-neutral-50/50 transition-colors ${isToday ? 'bg-indigo-50/20' : 'bg-white'}`}>
                  <span className={`text-xs font-black self-end ${isToday ? 'bg-black text-white px-2 py-0.5 rounded-full' : 'text-gray-400'}`}>
                    {dayNum}
                  </span>
                  
                  {/* List posts */}
                  <div className="flex-1 overflow-y-auto space-y-1 mt-1 pr-0.5 scrollbar-thin">
                    {dayPosts.map(post => (
                      <div
                        key={post.id}
                        onClick={() => alert(`Title: ${post.video.title}\nStatus: ${post.status}\nScheduled: ${new Date(post.scheduledFor).toLocaleString()}${post.errorMessage ? `\nError: ${post.errorMessage}` : ''}`)}
                        className={`p-1 border rounded-lg text-[9px] font-bold truncate cursor-pointer transition-all flex items-center gap-1 hover:shadow-2xs ${getStatusColor(post.status)}`}
                      >
                        {getPlatformIcon(post.platform)}
                        <span className="truncate flex-1">{post.video.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Week View */}
        {viewMode === 'week' && (
          <div className="space-y-4 font-sans">
            <div className="p-4 bg-neutral-50 border border-gray-100 rounded-2xl flex items-center gap-2">
              <Info className="h-4.5 w-4.5 text-gray-400 mt-0.5" />
              <p className="text-xs text-gray-500 font-semibold">
                Weekly calendar list view. Shows upcoming publications scheduled for this month.
              </p>
            </div>
            <div className="border border-neutral-100 rounded-3xl overflow-hidden divide-y divide-gray-100">
              {scheduledPosts.length > 0 ? (
                scheduledPosts.map(post => (
                  <div key={post.id} className="flex justify-between items-center p-4 bg-white hover:bg-neutral-50 transition-colors text-xs">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-12 rounded-lg bg-neutral-100 overflow-hidden flex items-center justify-center shrink-0 border">
                        {post.video.thumbnailUrl ? (
                          <img src={post.video.thumbnailUrl} className="object-cover h-full w-full" alt="" />
                        ) : (
                          <Video className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-extrabold text-black hover:underline cursor-pointer">{post.video.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400 font-bold">
                          {getPlatformIcon(post.platform)}
                          <span>{post.platform.toUpperCase()}</span>
                          <span>•</span>
                          <Clock className="h-3 w-3" />
                          <span>{new Date(post.scheduledFor).toLocaleString()}</span>
                          {post.campaign && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-600 font-extrabold bg-indigo-50 px-1.5 py-0.5 rounded-md">Campaign: {post.campaign.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${getStatusColor(post.status)}`}>
                        {post.status.replace('_', ' ')}
                      </span>
                      {post.status !== 'PUBLISHED' && (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-sm text-gray-400 font-semibold bg-gray-50/20">
                  No posts scheduled for this week.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Day View */}
        {viewMode === 'day' && (
          <div className="space-y-4">
            <h3 className="font-extrabold text-sm text-neutral-800 uppercase tracking-wider">Today's Schedule</h3>
            <div className="border border-neutral-100 rounded-3xl overflow-hidden divide-y divide-gray-100">
              {scheduledPosts.filter(p => new Date(p.scheduledFor).toDateString() === new Date().toDateString()).length > 0 ? (
                scheduledPosts
                  .filter(p => new Date(p.scheduledFor).toDateString() === new Date().toDateString())
                  .map(post => (
                    <div key={post.id} className="flex justify-between items-center p-4 bg-white text-xs">
                      <div className="flex items-center gap-3">
                        {getPlatformIcon(post.platform)}
                        <div>
                          <p className="font-extrabold text-black">{post.video.title}</p>
                          <span className="text-[10px] text-gray-400 font-bold block mt-0.5">
                            Scheduled at {new Date(post.scheduledFor).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getStatusColor(post.status)}`}>
                        {post.status}
                      </span>
                    </div>
                  ))
              ) : (
                <div className="text-center py-12 text-sm text-gray-400 font-semibold bg-gray-50/20">
                  No posts scheduled for today.
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Schedule Post Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-neutral-100 shadow-2xl p-6 max-w-md w-full space-y-6 relative animate-in zoom-in-95 duration-200">
            <div>
              <h2 className="text-lg font-black text-black font-sans">Schedule Video Post</h2>
              <p className="text-xs text-gray-500 mt-1 font-sans">Queue a video for auto-distribution across channels.</p>
            </div>

            <form onSubmit={handleSchedulePost} className="space-y-4 text-xs font-sans">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Choose Video</label>
                <select
                  value={selectedVideoId}
                  onChange={(e) => setSelectedVideoId(e.target.value)}
                  className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2.5 font-semibold text-gray-700"
                  required
                >
                  <option value="" disabled>-- Select a video --</option>
                  {videos.map(v => (
                    <option key={v.id} value={v.id}>{v.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Platform</label>
                <select
                  value={schedulePlatform}
                  onChange={(e) => setSchedulePlatform(e.target.value)}
                  className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2.5 font-semibold text-gray-700"
                >
                  <option value="youtube">YouTube</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="twitter">X (Twitter)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2 font-semibold text-gray-700"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2 font-semibold text-gray-700"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-50">
                <Button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="w-full rounded-xl border border-gray-150 bg-white text-gray-500 hover:text-black hover:bg-neutral-50 px-4 py-2.5 font-bold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={scheduling}
                  className="w-full rounded-xl bg-black text-white hover:bg-neutral-800 px-4 py-2.5 font-bold cursor-pointer flex justify-center items-center gap-1 shadow-xs"
                >
                  {scheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Schedule'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
