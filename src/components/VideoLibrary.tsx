import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Play, Download, Link2, Trash2, Search, ArrowUpDown, 
  Video, Calendar, HardDrive, Check, X, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  thumbnailKey?: string | null;
  createdAt: string;
  project: {
    name: string;
    videoRatio?: 'RATIO_16_9' | 'RATIO_9_16' | 'RATIO_1_1' | null;
  };
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function VideoCard({
  video,
  setActiveWatchVideo,
  handleCopyLink,
  handleDownload,
  handleDelete,
  copiedId,
  isDeletePending,
}: {
  video: VideoItem;
  setActiveWatchVideo: (video: VideoItem) => void;
  handleCopyLink: (video: VideoItem) => void;
  handleDownload: (video: VideoItem) => void;
  handleDelete: (id: string) => void;
  copiedId: string | null;
  isDeletePending: boolean;
}) {
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    // Debounce hover play by 300ms
    timeoutRef.current = setTimeout(() => {
      setIsPlayingPreview(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    setIsPlayingPreview(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <Card className="group rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col h-full">
      {/* Media Card Preview Header */}
      <div 
        className="relative aspect-video bg-neutral-950 flex items-center justify-center border-b border-gray-100 cursor-pointer overflow-hidden"
        onClick={() => setActiveWatchVideo(video)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Hover muted video preview */}
        {isPlayingPreview && video.videoUrl ? (
          <div className="absolute inset-0 w-full h-full bg-neutral-950 flex items-center justify-center overflow-hidden z-10">
            {video.thumbnailUrl ? (
              <img 
                src={video.thumbnailUrl} 
                alt="" 
                className="absolute inset-0 w-full h-full object-cover blur-md opacity-30 select-none pointer-events-none" 
              />
            ) : null}
            <video
              src={video.videoUrl}
              muted
              playsInline
              autoPlay
              loop
              className="relative z-10 max-w-full max-h-full object-contain"
            />
          </div>
        ) : null}

        {/* Static Thumbnail / Placeholder */}
        {video.thumbnailUrl ? (
          (() => {
            console.log(`[VIDEOLIBRARY_CARD_THUMBNAIL] Video: "${video.title}" (ID: ${video.id}), Thumbnail URL: ${video.thumbnailUrl}`);
            return (
              <div className="absolute inset-0 w-full h-full bg-neutral-950 flex items-center justify-center overflow-hidden">
                <img 
                  src={video.thumbnailUrl} 
                  alt="" 
                  className="absolute inset-0 w-full h-full object-cover blur-md opacity-30 select-none pointer-events-none" 
                />
                <img 
                  src={video.thumbnailUrl} 
                  alt={video.title} 
                  className="relative z-10 max-w-full max-h-full object-contain select-none pointer-events-none transition-transform duration-300 group-hover:scale-105" 
                  onLoad={() => console.log(`[VIDEOLIBRARY_CARD_THUMBNAIL] Thumbnail loaded successfully for Video ID: ${video.id}`)}
                  onError={() => console.error(`[VIDEOLIBRARY_CARD_THUMBNAIL] Failed to load thumbnail image for Video ID: ${video.id}, URL: ${video.thumbnailUrl}`)}
                />
              </div>
            );
          })()
        ) : (
          (() => {
            console.log(`[VIDEOLIBRARY_CARD_THUMBNAIL] No thumbnail found for video: "${video.title}" (ID: ${video.id}). Rendering placeholder.`);
            return (
              <>
                <div className="absolute inset-0 bg-radial-gradient from-neutral-800 to-neutral-950 opacity-90" />
                <div className="relative z-10 flex flex-col items-center gap-2.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white border border-white/20 backdrop-blur-md group-hover:scale-110 group-hover:bg-white group-hover:text-black transition-all duration-300">
                    <Play className="h-5 w-5 fill-current ml-0.5" />
                  </div>
                </div>
              </>
            );
          })()
        )}

        {/* Duration HUD */}
        <div className="absolute bottom-3 right-3 z-20 pointer-events-none">
          <span className="text-[10px] tracking-wider uppercase font-extrabold text-white bg-black/60 border border-white/10 px-2 py-0.5 rounded-full backdrop-blur-xs">
            {formatDuration(video.duration)}
          </span>
        </div>
      </div>

      {/* Video metadata body */}
      <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-1">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
            {video.project?.name || 'Project'}
          </span>
          <h4 className="font-bold text-sm text-black truncate group-hover:text-neutral-900 transition-colors"
              title={video.title}>
            {video.title}
          </h4>
        </div>

        <div className="space-y-2 pt-2 border-t border-gray-50 text-[11px] text-gray-500 font-semibold font-sans">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            <span>{new Date(video.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="h-3.5 w-3.5 text-gray-400" />
            <span>{formatBytes(video.fileSize)}</span>
          </div>
        </div>

        {/* Card Actions bar */}
        <div className="grid grid-cols-3 gap-2 pt-3">
          <button
            onClick={() => handleCopyLink(video)}
            className="flex justify-center items-center gap-1.5 py-2 text-xs font-bold rounded-xl border border-gray-150 text-gray-600 hover:text-black hover:bg-neutral-50 active:bg-neutral-100 transition-all"
            title="Copy Video Link"
          >
            {copiedId === video.id ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-600">Copied</span>
              </>
            ) : (
              <>
                <Link2 className="h-3.5 w-3.5" />
                <span>Link</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleDownload(video)}
            className="flex justify-center items-center gap-1.5 py-2 text-xs font-bold rounded-xl border border-gray-150 text-gray-600 hover:text-black hover:bg-neutral-50 active:bg-neutral-100 transition-all"
            title="Download Video"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Get</span>
          </button>

          <button
            onClick={() => handleDelete(video.id)}
            disabled={isDeletePending}
            className="flex justify-center items-center gap-1.5 py-2 text-xs font-bold rounded-xl border border-red-100 text-red-500 hover:text-red-700 hover:bg-red-50/50 active:bg-red-50 transition-all disabled:opacity-50"
            title="Delete Video"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VideoLibrary() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [activeWatchVideo, setActiveWatchVideo] = useState<VideoItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch videos
  const { data, isLoading, error } = useQuery<{ videos: VideoItem[] }>({
    queryKey: ['videos'],
    queryFn: async () => {
      const res = await fetch('/api/videos');
      if (!res.ok) throw new Error('Failed to fetch videos');
      return res.json();
    },
  });

  const videos = data?.videos ?? [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/videos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete video');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const handleCopyLink = (video: VideoItem) => {
    navigator.clipboard.writeText(video.videoUrl);
    setCopiedId(video.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (video: VideoItem) => {
    // Standard download trigger via temporary anchor element
    const a = document.createElement('a');
    a.href = video.videoUrl;
    // Format filename: project-name.mp4 (or slugified)
    const sanitizedTitle = video.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.download = `${sanitizedTitle || 'avatar-video'}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to permanently delete this video? This will remove the file from Cloudflare R2 and PostgreSQL.')) {
      deleteMutation.mutate(id);
    }
  };

  // Filter and sort logic
  const filteredVideos = videos
    .filter((v) => {
      const term = search.toLowerCase().trim();
      return (
        v.title.toLowerCase().includes(term) ||
        (v.project?.name && v.project.name.toLowerCase().includes(term))
      );
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-1">
      {/* Header welcome banner */}
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold font-sans tracking-tight text-black">
          Video Library
        </h1>
        <p className="text-base text-gray-500 font-sans max-w-xl leading-relaxed">
          Manage, preview, and download all generated avatar video files stored securely on Cloudflare R2.
        </p>
      </div>

      {/* Control bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by project name or video title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-150 rounded-2xl text-sm font-semibold placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-gray-500" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
            className="bg-white border border-gray-150 rounded-2xl px-4 py-2.5 text-sm font-semibold text-gray-600 focus:outline-hidden focus:ring-2 focus:ring-black/10 focus:border-black transition-all cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-black animate-spin" />
          <p className="text-sm font-semibold text-gray-500">Loading your video library...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="py-20 text-center">
          <p className="text-red-500 font-semibold">Failed to load videos: {(error as Error).message}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filteredVideos.length === 0 && (
        <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/20">
          <Video className="h-10 w-10 text-gray-300 mx-auto mb-4" />
          <h3 className="font-bold text-gray-900 text-lg">No videos found</h3>
          <p className="text-sm text-gray-400 max-w-xs mx-auto mt-1 font-semibold">
            {search ? "No matches found for your search term." : "Generate a video in the project pipeline to see it listed here."}
          </p>
        </div>
      )}

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredVideos.map((video) => (
          <motion.div
            key={video.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <VideoCard
              video={video}
              setActiveWatchVideo={setActiveWatchVideo}
              handleCopyLink={handleCopyLink}
              handleDownload={handleDownload}
              handleDelete={handleDelete}
              copiedId={copiedId}
              isDeletePending={deleteMutation.isPending}
            />
          </motion.div>
        ))}
      </div>

      {/* Watch Video Modal overlay */}
      <AnimatePresence>
        {activeWatchVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveWatchVideo(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            {(() => {
              const projectRatio = activeWatchVideo.project?.videoRatio;
              const ratio = projectRatio === 'RATIO_9_16' ? '9:16' : projectRatio === 'RATIO_1_1' ? '1:1' : '16:9';
              
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                  className={`relative bg-black rounded-3xl shadow-2xl overflow-hidden border border-neutral-800 z-50 flex flex-col transition-all duration-300 mx-auto ${
                    ratio === '9:16'
                      ? 'w-full max-w-sm md:max-w-[380px]'
                      : ratio === '1:1'
                        ? 'w-full max-w-xl'
                        : 'w-full max-w-4xl'
                  }`}
                >
                  {/* Header Bar */}
                  <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-6 z-10">
                    <span className="text-sm font-bold text-white font-sans drop-shadow-md truncate max-w-[80%]">
                      {activeWatchVideo.title}
                    </span>
                    <button
                      onClick={() => setActiveWatchVideo(null)}
                      className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all duration-200"
                      aria-label="Close video player"
                    >
                      <X className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  {/* Video Player */}
                  <div className={`relative w-full bg-neutral-950 flex items-center justify-center overflow-hidden ${
                    ratio === '9:16'
                      ? 'aspect-[9/16] max-h-[75vh]'
                      : ratio === '1:1'
                        ? 'aspect-square max-h-[75vh]'
                        : 'aspect-video'
                  }`}>
                    {activeWatchVideo.thumbnailUrl ? (
                      <img 
                        src={activeWatchVideo.thumbnailUrl} 
                        alt="" 
                        className="absolute inset-0 w-full h-full object-cover blur-md opacity-30 select-none pointer-events-none" 
                      />
                    ) : null}
                    <video
                      src={activeWatchVideo.videoUrl}
                      controls
                      autoPlay
                      className="relative z-10 w-full h-full object-contain"
                    />
                  </div>
                </motion.div>
              );
            })()}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
