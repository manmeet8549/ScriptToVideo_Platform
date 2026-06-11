import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sparkles, Loader2, Play, ExternalLink,
  CheckCircle2, AlertCircle, Eye, EyeOff, Lock,
  Video, UploadCloud, ChevronRight, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Youtube = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.522 3.5 12 3.5 12 3.5s-7.522 0-9.388.555A3.002 3.002 0 0 0 .503 6.163C0 8.03 0 12 0 12s0 3.97.503 5.837a3.003 3.003 0 0 0 2.11 2.108C5.113 20.5 12 20.5 12 20.5s7.522 0 9.388-.555a3.003 3.003 0 0 0 2.11-2.108C24 15.97 24 12 24 12s0-3.97-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

interface VideoItem {
  id: string;
  userId: string;
  projectId: string;
  title: string;
  status: string;
  r2Key: string;
  videoUrl: string;
  fileSize: number | null;
  duration: number | null;
  thumbnailUrl?: string | null;
  createdAt: string;
  project: {
    id: string;
    name: string;
    videoRatio?: string | null;
  };
}

interface SocialAccount {
  platform: string;
  email: string | null;
  channelName: string | null;
  connectedAt: string;
}

interface PublishedVideo {
  id: string;
  projectId: string;
  platform: string;
  title: string;
  status: string;
  externalVideoId: string | null;
  videoUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export default function PublishSection() {
  const queryClient = useQueryClient();

  // State
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [activePublishId, setActivePublishId] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<string | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [historyTab, setHistoryTab] = useState<'all' | 'published' | 'pending' | 'failed'>('all');

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

  // Fetch Connected Accounts
  const { data: accountsData, refetch: refetchAccounts } = useQuery<{ accounts: SocialAccount[] }>({
    queryKey: ['publishAccounts'],
    queryFn: async () => {
      const res = await fetch('/api/publish/accounts');
      if (!res.ok) throw new Error('Failed to fetch connected accounts');
      return res.json();
    },
  });
  const accounts = accountsData?.accounts ?? [];
  const youtubeAccount = accounts.find((acc) => acc.platform === 'youtube');

  // Fetch Published History
  const { data: historyData, isLoading: isHistoryLoading, refetch: refetchHistory } = useQuery<{ publishedVideos: PublishedVideo[] }>({
    queryKey: ['publishedHistory'],
    queryFn: async () => {
      const res = await fetch('/api/publish/videos');
      if (!res.ok) throw new Error('Failed to fetch published history');
      return res.json();
    },
  });
  const publishedVideos = historyData?.publishedVideos ?? [];

  // Check URL query parameters on load/videos change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const videoIdParam = params.get('video');
    if (videoIdParam && videos.length > 0) {
      const selected = videos.find((v) => v.id === videoIdParam);
      if (selected) {
        setSelectedVideo(selected);
        setTitle(selected.title);
      }
    }
  }, [videos]);

  // Handle selected video change
  const handleSelectVideo = (video: VideoItem) => {
    setSelectedVideo(video);
    setTitle(video.title);
    setDescription('');
    setTags('');
    // Update URL query parameter
    const newUrl = `${window.location.pathname}?tab=publish&video=${video.id}`;
    window.history.pushState({ activeTab: 'publish' }, '', newUrl);
  };

  // Disconnect YouTube account
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auth/youtube/disconnect', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to disconnect YouTube account');
      return res.json();
    },
    onSuccess: () => {
      refetchAccounts();
      queryClient.invalidateQueries({ queryKey: ['publishAccounts'] });
    },
  });

  // AI Generate Metadata
  const handleAiGenerate = async () => {
    if (!selectedVideo) return;
    setIsAiGenerating(true);
    try {
      const res = await fetch('/api/publish/generate-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedVideo.projectId }),
      });
      if (!res.ok) throw new Error('Metadata generation failed');
      const data = await res.json();
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.tags) setTags(data.tags.join(', '));
    } catch (err) {
      console.error(err);
      alert('Could not generate metadata. Please verify that your NVIDIA NIM API Key is set up in the API Keys tab.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Initiate Upload
  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVideo) throw new Error('No video selected');
      const res = await fetch('/api/publish/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: selectedVideo.id,
          title,
          description,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          visibility,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to start upload');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setActivePublishId(data.publishedVideoId);
      setPollingStatus(data.status || 'Preparing Upload');
      refetchHistory();
      queryClient.invalidateQueries({ queryKey: ['publishedVideos'] });
    },
  });

  // Polling Status check
  useEffect(() => {
    if (!activePublishId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/publish/status?id=${activePublishId}`);
        if (res.ok) {
          const data = await res.json();
          const status = data.publishedVideo.status;
          setPollingStatus(status);

          if (status === 'Published' || status.startsWith('Failed')) {
            setActivePublishId(null);
            refetchHistory();
            queryClient.invalidateQueries({ queryKey: ['videos'] });
            queryClient.invalidateQueries({ queryKey: ['publishedVideos'] });
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activePublishId, queryClient, refetchHistory]);

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect your YouTube Channel? You will need to re-authenticate to publish videos.')) {
      disconnectMutation.mutate();
    }
  };

  const handleConnect = () => {
    // Redirects to auth redirect api endpoint
    window.location.href = '/api/auth/youtube';
  };

  // Filter history list
  const filteredHistory = publishedVideos.filter((pv) => {
    if (historyTab === 'published') return pv.status === 'Published';
    if (historyTab === 'failed') return pv.status.startsWith('Failed');
    if (historyTab === 'pending') {
      return pv.status !== 'Published' && !pv.status.startsWith('Failed');
    }
    return true; // 'all'
  });

  // Format Helper
  const getStatusBadge = (status: string) => {
    if (status === 'Published') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-100">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Published
        </span>
      );
    }
    if (status.startsWith('Failed')) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 border border-red-100" title={status}>
          <AlertCircle className="h-3.5 w-3.5" />
          Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-100">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-1">
      {/* Title Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold font-sans tracking-tight text-black flex items-center gap-3">
          Publish & Distribution
        </h1>
        <p className="text-base text-gray-500 font-sans max-w-xl leading-relaxed">
          Distribute your generated AI videos directly to your connected social channels with smart AI-generated metadata.
        </p>
      </div>

      {/* 1. Branding & Connections */}
      <Card className="rounded-3xl border border-gray-150 bg-white p-6 shadow-xs overflow-hidden">
        <CardContent className="p-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shadow-inner">
              <Youtube className="h-7 w-7 fill-current" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-base text-black font-sans leading-tight">
                YouTube Account Integration
              </h3>
              <p className="text-xs text-gray-400 font-semibold font-sans">
                {youtubeAccount
                  ? `Connected channel: ${youtubeAccount.channelName || youtubeAccount.email || 'YouTube Creator'}`
                  : 'Connect your YouTube account to begin direct video publishing.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {youtubeAccount ? (
              <>
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full self-end">
                    Connected
                  </span>
                </div>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnectMutation.isPending}
                  className="px-5 py-2.5 rounded-2xl bg-neutral-50 border border-gray-200 hover:bg-neutral-100 active:bg-neutral-150 text-xs font-bold text-gray-600 hover:text-black transition-colors cursor-pointer disabled:opacity-50"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                className="px-6 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-xs font-bold text-white transition-all shadow-sm shadow-red-200 cursor-pointer flex items-center gap-2"
              >
                <Youtube className="h-4.5 w-4.5 fill-current" />
                Connect YouTube
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Main Publishing Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form Section */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <CardContent className="p-0 space-y-6">
              <h3 className="font-extrabold text-lg text-black font-sans leading-tight border-b border-gray-50 pb-3">
                Metadata Editor
              </h3>

              {/* Video Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 font-sans block">Select Video to Publish</label>
                <select
                  value={selectedVideo?.id || ''}
                  onChange={(e) => {
                    const video = videos.find((v) => v.id === e.target.value);
                    if (video) handleSelectVideo(video);
                  }}
                  className="w-full bg-white border border-gray-150 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-black/10 focus:border-black transition-all cursor-pointer"
                >
                  <option value="" disabled>-- Select generated video --</option>
                  {videos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.title} ({v.project?.name || 'Project'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Form elements (Active only if video selected) */}
              <AnimatePresence mode="wait">
                {selectedVideo ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="space-y-5"
                  >
                    {/* Auto-generate helper */}
                    <div className="flex justify-between items-center bg-neutral-50 border border-gray-100 px-4 py-3 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-gray-400" />
                        <span className="text-[11px] font-semibold text-gray-500 font-sans">
                          Auto-optimize details with NVIDIA NIM (Llama 3.1 70B).
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAiGenerate}
                        disabled={isAiGenerating}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-black text-white hover:bg-neutral-800 text-[10px] font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        {isAiGenerating ? (
                          <Loader2 className="h-3 w-3 animate-spin text-white" />
                        ) : (
                          <Sparkles className="h-3 w-3 fill-current text-white animate-pulse" />
                        )}
                        AI Generate
                      </button>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 font-sans block">Video Title</label>
                      <input
                        type="text"
                        placeholder="Enter catchy YouTube video title..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={100}
                        className="w-full bg-white border border-gray-150 rounded-2xl px-4 py-3 text-sm font-semibold placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
                      />
                      <span className="text-[10px] text-gray-400 font-semibold text-right block pr-1">
                        {title.length}/100 characters
                      </span>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 font-sans block">Description</label>
                      <textarea
                        rows={4}
                        placeholder="Enter description, social links, timestamps, and hashtags..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-white border border-gray-150 rounded-2xl px-4 py-3 text-sm font-semibold placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-black/10 focus:border-black transition-all font-sans"
                      />
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 font-sans block">Tags (Comma-separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. AI, video generation, avatar, scriptforge"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        className="w-full bg-white border border-gray-150 rounded-2xl px-4 py-3 text-sm font-semibold placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
                      />
                    </div>

                    {/* Visibility */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 font-sans block">Visibility</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: 'public', label: 'Public', icon: Eye },
                          { value: 'unlisted', label: 'Unlisted', icon: EyeOff },
                          { value: 'private', label: 'Private', icon: Lock }
                        ].map((v) => {
                          const Icon = v.icon;
                          const isSelected = visibility === v.value;
                          return (
                            <button
                              key={v.value}
                              type="button"
                              onClick={() => setVisibility(v.value as 'public' | 'unlisted' | 'private')}
                              className={`flex items-center justify-center gap-2 py-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-black text-white border-black shadow-xs'
                                  : 'bg-white text-gray-600 border-gray-200 hover:bg-neutral-50 hover:text-black'
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                              {v.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Publish Submit */}
                    <div className="pt-3 border-t border-gray-50">
                      <button
                        onClick={() => publishMutation.mutate()}
                        disabled={publishMutation.isPending || !youtubeAccount || !title.trim() || activePublishId !== null}
                        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-black text-white hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-black font-extrabold text-sm transition-all cursor-pointer shadow-xs"
                      >
                        {publishMutation.isPending ? (
                          <>
                            <Loader2 className="h-4.5 w-4.5 animate-spin" />
                            Preparing Upload...
                          </>
                        ) : (
                          <>
                            <UploadCloud className="h-4.5 w-4.5" />
                            Publish to YouTube
                          </>
                        )}
                      </button>
                      {!youtubeAccount && (
                        <p className="text-[10px] text-red-500 font-bold text-center mt-2">
                          * Please connect your YouTube account above before publishing.
                        </p>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <div className="py-16 text-center border border-dashed border-gray-150 rounded-2xl bg-neutral-50/40">
                    <Video className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-xs font-semibold text-gray-400">
                      Select a video from the dropdown menu to configure publishing details.
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Preview & Status HUD */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Video Preview Panel */}
          <Card className="rounded-3xl border border-gray-100 bg-neutral-950 p-0 shadow-sm overflow-hidden flex flex-col aspect-video relative justify-center items-center">
            {selectedVideo ? (
              <video
                src={selectedVideo.videoUrl}
                controls
                className="w-full h-full object-contain relative z-10"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-white/40">
                <Play className="h-12 w-12 stroke-current opacity-30" />
                <span className="text-xs font-semibold">Preview Player</span>
              </div>
            )}
          </Card>

          {/* Progress HUD */}
          <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <CardContent className="p-0 space-y-4">
              <h4 className="font-extrabold text-sm text-black font-sans leading-tight border-b border-gray-50 pb-2">
                Active Publishing HUD
              </h4>

              {pollingStatus || publishMutation.isPending ? (
                <div className="space-y-4">
                  {/* Status Indicator */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400">Current Phase</span>
                    <span className="text-xs font-bold text-black bg-neutral-100 px-3 py-1 rounded-full border border-neutral-150">
                      {pollingStatus || 'Preparing Upload'}
                    </span>
                  </div>

                  {/* Micro-Progress Bar */}
                  {(() => {
                    let percent = 0;
                    if (pollingStatus?.startsWith('Uploading:')) {
                      const match = pollingStatus.match(/\d+/);
                      if (match) percent = parseInt(match[0]);
                    } else if (pollingStatus === 'Processing') {
                      percent = 90;
                    } else if (pollingStatus === 'Published') {
                      percent = 100;
                    }

                    return (
                      <div className="space-y-1.5">
                        <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden border border-neutral-150">
                          <motion.div
                            className={`h-full rounded-full ${
                              pollingStatus?.startsWith('Failed') ? 'bg-red-500' : 'bg-black'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 font-semibold block text-right">
                          {pollingStatus?.startsWith('Uploading:')
                            ? `Uploading: ${percent}%`
                            : pollingStatus === 'Processing'
                            ? 'Processing: 90% (Finalizing with YouTube)'
                            : pollingStatus === 'Published'
                            ? 'Complete: 100%'
                            : pollingStatus?.startsWith('Failed')
                            ? 'Failed'
                            : 'Preparing: 0%'}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Action or Success Details */}
                  {pollingStatus === 'Published' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between gap-3 mt-2"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                        <span className="text-[11px] font-bold text-emerald-700">Video successfully published!</span>
                      </div>
                      <a
                        href={publishedVideos.find((pv) => pv.id === activePublishId || pv.title === title)?.videoUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-bold shadow-xs transition-colors"
                      >
                        Watch
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </motion.div>
                  )}

                  {pollingStatus?.startsWith('Failed') && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2.5 mt-2">
                      <AlertCircle className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-bold text-red-700 block">Upload Failed</span>
                        <span className="text-[10px] font-semibold text-red-500 leading-snug block">
                          {pollingStatus.replace('Failed:', '').trim() || 'Internal error while uploading chunks.'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center bg-neutral-50/50 rounded-2xl border border-dashed border-gray-150 flex flex-col items-center gap-1.5 text-gray-400">
                  <UploadCloud className="h-7 w-7 text-gray-300 animate-pulse" />
                  <p className="text-xs font-semibold">No active uploads in progress.</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

      </div>

      {/* 3. Published History Grid Section */}
      <div className="space-y-5 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-3">
          <h3 className="font-extrabold text-xl text-black font-sans leading-tight">
            Distribution History
          </h3>

          {/* Filter Toggles */}
          <div className="flex items-center gap-1.5 bg-neutral-50 border border-gray-200 p-1 rounded-xl self-start">
            {[
              { id: 'all', label: 'All' },
              { id: 'published', label: 'Published' },
              { id: 'pending', label: 'Pending' },
              { id: 'failed', label: 'Failed' }
            ].map((tab) => {
              const isSelected = historyTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setHistoryTab(tab.id as 'all' | 'published' | 'pending' | 'failed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white text-black shadow-xs font-extrabold'
                      : 'text-gray-400 hover:text-black'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* History Loading / Empty States */}
        {isHistoryLoading ? (
          <div className="py-16 flex justify-center items-center gap-2.5 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-xs font-semibold">Loading distribution history...</span>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-gray-150 rounded-3xl bg-neutral-50/30">
            <Youtube className="h-9 w-9 text-gray-300 mx-auto mb-3 opacity-60" />
            <h4 className="font-bold text-gray-900 text-sm">No uploads found</h4>
            <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1 font-semibold">
              No videos match the selected filter or no publishing tasks have been initiated yet.
            </p>
          </div>
        ) : (
          /* History Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHistory.map((pv) => (
              <Card
                key={pv.id}
                className="group rounded-3xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-44"
              >
                <CardContent className="p-0 flex flex-col justify-between h-full space-y-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-1 min-w-0">
                      <h4 className="font-bold text-sm text-black truncate block font-sans" title={pv.title}>
                        {pv.title}
                      </h4>
                      <span className="text-[10px] text-gray-400 font-semibold block">
                        Published {new Date(pv.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </span>
                    </div>
                    {getStatusBadge(pv.status)}
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      <Youtube className="h-3 w-3 fill-current" />
                      {pv.platform}
                    </div>

                    {pv.status === 'Published' && pv.videoUrl ? (
                      <a
                        href={pv.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-black hover:opacity-80 transition-opacity"
                      >
                        Watch Video
                        <ChevronRight className="h-4 w-4" />
                      </a>
                    ) : pv.status.startsWith('Failed') ? (
                      <button
                        onClick={() => {
                          const matchedVideo = videos.find((v) => v.projectId === pv.projectId);
                          if (matchedVideo) {
                            setSelectedVideo(matchedVideo);
                            setTitle(pv.title);
                            window.scrollTo({ top: 200, behavior: 'smooth' });
                          } else {
                            alert('Source video file could not be found to retry. Please verify the video exists in your Video Library.');
                          }
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                      >
                        Retry Setup
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-400 font-bold">
                        Pending Finish
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
