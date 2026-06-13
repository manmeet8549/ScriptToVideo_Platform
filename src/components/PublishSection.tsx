import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sparkles, Loader2, Play,
  CheckCircle2, AlertCircle,
  Video, UploadCloud, ChevronRight, Info, Trash2, Plus, Edit2, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Custom Brand Icon SVGs ---
const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.522 3.5 12 3.5 12 3.5s-7.522 0-9.388.555A3.002 3.002 0 0 0 .503 6.163C0 8.03 0 12 0 12s0 3.97.503 5.837a3.003 3.003 0 0 0 2.11 2.108C5.113 20.5 12 20.5 12 20.5s7.522 0 9.388-.555a3.003 3.003 0 0 0 2.11-2.108C24 15.97 24 12 24 12s0-3.97-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
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
  id: string;
  platform: string;
  email: string | null;
  channelName: string | null;
  connectedAt: string;
  isDefault: boolean;
  channelId?: string | null;
  subscriberCount?: string | null;
  zernioAccountId?: string | null;
  accountHandle?: string | null;
}

interface PublishedVideo {
  id: string;
  projectId: string;
  platform: string;
  socialAccountId: string | null;
  title: string;
  status: string;
  externalVideoId: string | null;
  videoUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
}

interface TrackingUpload {
  id: string;
  platform: string;
  channelName: string | null;
  status: string;
  videoUrl?: string | null;
}

export default function PublishSection() {
  const queryClient = useQueryClient();

  // State - Video Selection
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

  // State - Platform Selection
  const [selectedPlatforms, setSelectedPlatforms] = useState<Record<string, boolean>>({
    youtube: true,
    linkedin: false,
    facebook: false,
    instagram: false,
    twitter: false,
  });

  // State - Selected Account IDs per Platform
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, string>>({});

  // State - Form Fields
  // YouTube Fields
  const [ytTitle, setYtTitle] = useState('');
  const [ytDescription, setYtDescription] = useState('');
  const [ytTags, setYtTags] = useState('');
  const [ytVisibility, setYtVisibility] = useState<'public' | 'unlisted' | 'private'>('public');

  // Other Platforms Fields
  const [liPostText, setLiPostText] = useState('');
  const [fbCaption, setFbCaption] = useState('');
  const [igCaption, setIgCaption] = useState('');
  const [twTweetText, setTwTweetText] = useState('');

  // State - Workers & Polling
  const [activeUploads, setActiveUploads] = useState<TrackingUpload[]>([]);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [historyTab, setHistoryTab] = useState<'all' | 'published' | 'scheduled' | 'pending' | 'failed'>('all');

  // State - Organization Settings & Scheduling
  const [org, setOrg] = useState<any>(null);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');

  useEffect(() => {
    fetch('/api/organizations')
      .then((res) => res.json())
      .then((data) => setOrg(data.organization))
      .catch((err) => console.error('Error loading org profile in publish:', err));
  }, []);

  // Fetch Videos
  const { data: videosData } = useQuery<{ videos: VideoItem[] }>({
    queryKey: ['videos'],
    queryFn: async () => {
      const res = await fetch('/api/videos');
      if (!res.ok) throw new Error('Failed to fetch videos');
      return res.json();
    },
  });
  const videos = useMemo(() => videosData?.videos ?? [], [videosData?.videos]);

  // Fetch Connected Accounts
  const { data: accountsData, refetch: refetchAccounts } = useQuery<{ accounts: SocialAccount[]; zernioConfigured: boolean }>({
    queryKey: ['publishAccounts'],
    queryFn: async () => {
      const res = await fetch('/api/publish/accounts');
      if (!res.ok) throw new Error('Failed to fetch connected accounts');
      return res.json();
    },
  });
  const accounts = useMemo(() => accountsData?.accounts ?? [], [accountsData?.accounts]);
  const zernioConfigured = accountsData?.zernioConfigured ?? true;

  // Fetch Published History
  const { data: historyData, refetch: refetchHistory } = useQuery<{ publishedVideos: PublishedVideo[] }>({
    queryKey: ['publishedHistory'],
    queryFn: async () => {
      const res = await fetch('/api/publish/videos');
      if (!res.ok) throw new Error('Failed to fetch published history');
      return res.json();
    },
  });
  const publishedVideos = useMemo(() => historyData?.publishedVideos ?? [], [historyData?.publishedVideos]);

  // Set default accounts in selector dropdowns when connections update
  useEffect(() => {
    setSelectedAccounts((prev) => {
      const updates: Record<string, string> = {};
      ['youtube', 'linkedin', 'facebook', 'instagram', 'twitter'].forEach((p) => {
        const platformAccounts = accounts.filter((a) => a.platform === p);
        if (platformAccounts.length > 0) {
          const defaultAcc = platformAccounts.find((a) => a.isDefault) || platformAccounts[0];
          const currentSelectedIsConnected = platformAccounts.some((a) => a.id === prev[p]);
          if (!prev[p] || !currentSelectedIsConnected) {
            updates[p] = defaultAcc.id;
          }
        }
      });
      if (Object.keys(updates).length > 0) {
        return { ...prev, ...updates };
      }
      return prev;
    });
  }, [accounts]);

  // Check URL query parameters on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const videoIdParam = params.get('video');
    if (videoIdParam && videos.length > 0) {
      const selected = videos.find((v) => v.id === videoIdParam);
      if (selected) {
        setSelectedVideo(selected);
        setYtTitle(selected.title);
      }
    }
  }, [videos]);

  // Handle selected video change
  const handleSelectVideo = (video: VideoItem) => {
    setSelectedVideo(video);
    setYtTitle(video.title);
    setYtDescription('');
    setYtTags('');
    setLiPostText('');
    setFbCaption('');
    setIgCaption('');
    setTwTweetText('');
    
    // Update URL query parameter
    const newUrl = `${window.location.pathname}?tab=publish&video=${video.id}`;
    window.history.pushState({ activeTab: 'publish' }, '', newUrl);
  };

  // Disconnect a specific social account
  const disconnectMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const res = await fetch('/api/publish/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: accountId }),
      });
      if (!res.ok) throw new Error('Failed to disconnect account');
      return res.json();
    },
    onSuccess: () => {
      refetchAccounts();
      queryClient.invalidateQueries({ queryKey: ['publishAccounts'] });
    },
  });

  // Account settings mutation (rename/setDefault)
  const accountSettingsMutation = useMutation({
    mutationFn: async (payload: { accountId: string; action: 'rename' | 'setDefault'; channelName?: string }) => {
      const res = await fetch('/api/publish/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update account settings');
      }
      return res.json();
    },
    onSuccess: () => {
      refetchAccounts();
    },
    onError: (err) => {
      alert(err.message);
    }
  });

  const handleRenameAccount = (accountId: string, currentName: string) => {
    const newName = prompt(`Rename account "${currentName}" to:`, currentName);
    if (newName && newName.trim() && newName.trim() !== currentName) {
      accountSettingsMutation.mutate({
        accountId,
        action: 'rename',
        channelName: newName.trim(),
      });
    }
  };

  const handleSetDefaultAccount = (accountId: string) => {
    accountSettingsMutation.mutate({
      accountId,
      action: 'setDefault',
    });
  };

  const handleDisconnect = (accountId: string, channelName: string) => {
    if (confirm(`Disconnect account: "${channelName}"? You will need to re-authenticate to publish to it.`)) {
      disconnectMutation.mutate(accountId);
    }
  };

  const handleConnect = async (platform: string) => {
    const platformLower = platform.toLowerCase();
    if (platformLower === 'youtube') {
      window.location.href = `/api/publish/auth/youtube`;
      return;
    }

    try {
      const res = await fetch(`/api/social/connect/${platformLower}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate Zernio connection URL');
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Connection URL was not returned');
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to connect account.');
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) => ({ ...prev, [platform]: !prev[platform] }));
  };

  // AI Content Generator
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
      
      // Auto-fill active targets
      if (data.youtube) {
        setYtTitle(data.youtube.title || '');
        setYtDescription(data.youtube.description || '');
        setYtTags(data.youtube.tags ? data.youtube.tags.join(', ') : '');
      }
      if (data.linkedin) {
        setLiPostText(data.linkedin.postText || '');
      }
      if (data.facebook) {
        setFbCaption(data.facebook.caption || '');
      }
      if (data.instagram) {
        setIgCaption(data.instagram.caption || '');
      }
      if (data.twitter) {
        setTwTweetText(data.twitter.tweetText || '');
      }
    } catch (err) {
      console.error(err);
      alert('Could not generate metadata. Please verify that your NVIDIA NIM API Key is set up in the API Keys tab.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Submit Upload to multiple targets simultaneously
  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVideo) throw new Error('No video selected');
      
      const targets = [];

      // Construct targets list
      if (selectedPlatforms.youtube && selectedAccounts.youtube) {
        targets.push({
          socialAccountId: selectedAccounts.youtube,
          title: ytTitle,
          description: ytDescription,
          tags: ytTags.split(',').map((t) => t.trim()).filter(Boolean),
          visibility: ytVisibility,
        });
      }
      if (selectedPlatforms.linkedin && selectedAccounts.linkedin) {
        targets.push({
          socialAccountId: selectedAccounts.linkedin,
          caption: liPostText,
        });
      }
      if (selectedPlatforms.facebook && selectedAccounts.facebook) {
        targets.push({
          socialAccountId: selectedAccounts.facebook,
          caption: fbCaption,
        });
      }
      if (selectedPlatforms.instagram && selectedAccounts.instagram) {
        targets.push({
          socialAccountId: selectedAccounts.instagram,
          caption: igCaption,
        });
      }
      if (selectedPlatforms.twitter && selectedAccounts.twitter) {
        targets.push({
          socialAccountId: selectedAccounts.twitter,
          tweetText: twTweetText,
        });
      }

      if (targets.length === 0) {
        throw new Error('Please select at least one connected social account to publish.');
      }

      const endpoint = (isScheduled || org?.approvalRequired) ? '/api/publish/schedule' : '/api/publish/upload';
      const scheduledFor = isScheduled ? new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString() : new Date().toISOString();

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: selectedVideo.id,
          targets,
          scheduledFor,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to start publishing');
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (isScheduled || org?.approvalRequired) {
        alert(data.message || 'Post Scheduled / Submitted for Approval!');
        setSelectedVideo(null);
        refetchHistory();
        queryClient.invalidateQueries({ queryKey: ['scheduledPosts'] });
        return;
      }
      const typedData = data as {
        uploads: Array<{
          publishedVideoId: string;
          platform: string;
          channelName: string | null;
        }>;
      };
      // Add initiated uploads to the active tracking list
      const newUploads = typedData.uploads.map((u) => ({
        id: u.publishedVideoId,
        platform: u.platform,
        channelName: u.channelName,
        status: 'Preparing Upload',
      }));

      setActiveUploads((prev) => [...prev, ...newUploads]);
      refetchHistory();
      queryClient.invalidateQueries({ queryKey: ['publishedVideos'] });
    },
    onError: (err) => {
      alert(err.message);
    }
  });

  // Polling Status check loop for all active uploads in parallel
  useEffect(() => {
    if (activeUploads.length === 0) return;

    const interval = setInterval(async () => {
      const updatedUploads = [...activeUploads];
      let hasChanges = false;

      await Promise.all(
        activeUploads.map(async (upload, idx) => {
          // Skip if already finished in previous checks
          if (upload.status === 'Published' || upload.status.startsWith('Failed')) {
            return;
          }

          try {
            const res = await fetch(`/api/publish/status?id=${upload.id}`);
            if (res.ok) {
              const data = await res.json();
              const newStatus = data.publishedVideo.status;
              const newUrl = data.publishedVideo.videoUrl;
              
              if (upload.status !== newStatus || upload.videoUrl !== newUrl) {
                updatedUploads[idx].status = newStatus;
                updatedUploads[idx].videoUrl = newUrl;
                hasChanges = true;
              }
            }
          } catch (err) {
            console.error(`Error polling status for ${upload.id}:`, err);
          }
        })
      );

      if (hasChanges) {
        setActiveUploads(updatedUploads);
        
        // If all active uploads are complete, clear tracking
        const allComplete = updatedUploads.every(
          (u) => u.status === 'Published' || u.status.startsWith('Failed')
        );
        if (allComplete) {
          // Clear active uploads list after 6s so they see the final Published state for a bit
          setTimeout(() => {
            setActiveUploads([]);
          }, 6000);
          
          refetchHistory();
          queryClient.invalidateQueries({ queryKey: ['videos'] });
          queryClient.invalidateQueries({ queryKey: ['publishedVideos'] });
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [activeUploads, queryClient, refetchHistory]);

  // Filter history list
  const filteredHistory = publishedVideos.filter((pv) => {
    if (historyTab === 'published') return pv.status === 'Published';
    if (historyTab === 'failed') return pv.status.startsWith('Failed');
    if (historyTab === 'scheduled') return pv.status === 'Scheduled';
    if (historyTab === 'pending') {
      return pv.status !== 'Published' && !pv.status.startsWith('Failed') && pv.status !== 'Scheduled';
    }
    return true; // 'all'
  });

  // Icon Match Helpers
  const getPlatformIcon = (platform: string, className = "h-5 w-5") => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return <YoutubeIcon className={`${className} text-[#FF0000]`} />;
      case 'linkedin':
        return <LinkedinIcon className={`${className} text-[#0A66C2]`} />;
      case 'facebook':
        return <FacebookIcon className={`${className} text-[#1877F2]`} />;
      case 'instagram':
        return <InstagramIcon className={`${className} text-[#E1306C]`} />;
      case 'twitter':
        return <TwitterIcon className={`${className} text-black`} />;
      default:
        return <Video className={`${className} text-gray-500`} />;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Published') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-100">
          <CheckCircle2 className="h-3 w-3" />
          Published
        </span>
      );
    }
    if (status.startsWith('Failed')) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 border border-red-100" title={status}>
          <AlertCircle className="h-3 w-3" />
          Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-100">
        <Loader2 className="h-3 w-3 animate-spin" />
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

      {/* 1. Connected Channels & Accounts Registry Grid */}
      <div className="space-y-5">
        <h3 className="font-extrabold text-lg text-black font-sans leading-tight">
          Social Channels Integration
        </h3>

        {!zernioConfigured && (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-2xl flex items-start gap-2.5">
            <Info className="h-4.5 w-4.5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-extrabold block mb-0.5">Social Publishing is Temporarily Unavailable</span>
              LinkedIn, Facebook, Instagram, and X (Twitter) publishing features are disabled because ZERNIO_API_KEY is not configured in the environment. YouTube publishing remains fully operational.
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { id: 'youtube', label: 'YouTube', colorClass: 'bg-red-50 border-red-100 text-[#FF0000]', icon: YoutubeIcon },
            { id: 'linkedin', label: 'LinkedIn', colorClass: 'bg-blue-50 border-blue-100 text-[#0A66C2]', icon: LinkedinIcon },
            { id: 'facebook', label: 'Facebook', colorClass: 'bg-indigo-50 border-indigo-100 text-[#1877F2]', icon: FacebookIcon },
            { id: 'instagram', label: 'Instagram', colorClass: 'bg-pink-50 border-pink-100 text-[#E1306C]', icon: InstagramIcon },
            { id: 'twitter', label: 'X (Twitter)', colorClass: 'bg-neutral-50 border-neutral-150 text-black', icon: TwitterIcon },
          ].map((platform) => {
            const Icon = platform.icon;
            const platformAccounts = accounts.filter((a) => a.platform === platform.id);

            return (
              <Card key={platform.id} className="rounded-3xl border border-gray-150 bg-white p-5 shadow-xs overflow-hidden flex flex-col justify-between h-48">
                <CardContent className="p-0 flex flex-col justify-between h-full space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`h-11 w-11 rounded-xl ${platform.colorClass} flex items-center justify-center shadow-inner`}>
                        <Icon className="h-5 w-5 fill-current" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-sm text-black font-sans">{platform.label}</span>
                        <span className="text-[10px] text-gray-400 font-bold block">
                          {platformAccounts.length} Connected
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleConnect(platform.id)}
                      disabled={platform.id !== 'youtube' && !zernioConfigured}
                      className="h-8 w-8 flex items-center justify-center rounded-full bg-neutral-50 border border-gray-200 text-gray-500 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      title={platform.id !== 'youtube' && !zernioConfigured ? "Configure ZERNIO_API_KEY to connect" : `Connect another ${platform.label} account`}
                    >
                      <Plus className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  {/* Connected Accounts List */}
                  <div className="flex-1 overflow-y-auto max-h-24 space-y-1.5 pr-1 scrollbar-thin">
                    {platformAccounts.length > 0 ? (
                      platformAccounts
                        .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0))
                        .map((acc) => {
                          const isDefault = acc.isDefault;
                          return (
                            <div key={acc.id} className={`flex justify-between items-center p-2 rounded-xl text-xs font-semibold ${isDefault ? 'bg-indigo-50 border border-indigo-100 text-indigo-950 shadow-2xs' : 'bg-neutral-50 border border-gray-100 text-gray-700'}`}>
                              <div className="flex flex-col min-w-0 flex-1 py-0.5 max-w-[65%]">
                                <div className="flex items-center gap-1 truncate max-w-full">
                                  {isDefault && <Star className="h-3 w-3 fill-indigo-500 text-indigo-500 shrink-0" />}
                                  <span className="truncate" title={`${acc.channelName || acc.email || 'Account'}${acc.channelId ? `\nChannel ID: ${acc.channelId}` : ''}${acc.subscriberCount ? `\nSubscribers: ${Number(acc.subscriberCount).toLocaleString()}` : ''}`}>
                                    {acc.channelName || acc.email}
                                  </span>
                                </div>
                                {acc.platform === 'youtube' && acc.channelId && (
                                  <span className="text-[9px] text-gray-400 font-medium block truncate max-w-full mt-0.5" title={`Channel ID: ${acc.channelId}`}>
                                    ID: {acc.channelId} {acc.subscriberCount ? `• ${Number(acc.subscriberCount).toLocaleString()} subs` : ''}
                                  </span>
                                )}
                                {acc.platform !== 'youtube' && acc.accountHandle && (
                                  <span className="text-[9px] text-gray-400 font-medium block truncate max-w-full mt-0.5" title={`Handle: ${acc.accountHandle}`}>
                                    @{acc.accountHandle}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleRenameAccount(acc.id, acc.channelName || '')}
                                  className="text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                  title="Rename Account"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                {!isDefault && (
                                  <button
                                    onClick={() => handleSetDefaultAccount(acc.id)}
                                    className="text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                    title="Set as Default"
                                  >
                                    <Star className="h-3 w-3" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDisconnect(acc.id, acc.channelName || 'Account')}
                                  className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                                  title="Disconnect Account"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="text-center py-4 text-[10px] text-gray-400 font-semibold border border-dashed border-gray-150 rounded-xl bg-gray-50/20">
                        No accounts connected
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Coming Soon Card */}
          <Card className="rounded-3xl border border-gray-100 bg-neutral-50/30 p-5 shadow-xs overflow-hidden flex flex-col justify-center items-center h-48 border-dashed">
            <CardContent className="p-0 text-center space-y-2">
              <span className="text-xs font-extrabold text-gray-400 bg-gray-100 border border-gray-150 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Coming Soon
              </span>
              <h4 className="font-extrabold text-sm text-gray-500">TikTok Publishing</h4>
              <p className="text-[10px] text-gray-400 max-w-[180px] mx-auto font-medium leading-relaxed">
                Connect and schedule videos directly to your TikTok account.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 2. Main Publishing Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form & Config targets */}
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

              {/* Dynamic Targets Setup (Only active if video selected) */}
              <AnimatePresence mode="wait">
                {selectedVideo ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="space-y-6"
                  >
                    {/* Auto-generate helper banner */}
                    <div className="flex justify-between items-center bg-neutral-50 border border-gray-100 px-4 py-3 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-gray-400" />
                        <span className="text-[11px] font-semibold text-gray-500 font-sans">
                          Auto-optimize copy for all active platforms via NVIDIA NIM.
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

                    {/* Platform Target Selector Checkboxes */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-gray-500 font-sans block">Publish To</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { id: 'youtube', label: 'YouTube' },
                          { id: 'linkedin', label: 'LinkedIn' },
                          { id: 'facebook', label: 'Facebook' },
                          { id: 'instagram', label: 'Instagram' },
                          { id: 'twitter', label: 'X (Twitter)' }
                        ].map((plat) => {
                          const isChecked = selectedPlatforms[plat.id];
                          const platformAccounts = accounts.filter((a) => a.platform === plat.id);
                          const isConnected = platformAccounts.length > 0;
                          const isDisabled = plat.id !== 'youtube' && !zernioConfigured;

                          return (
                            <div key={plat.id} className={`p-4 border rounded-2xl transition-all ${isChecked ? 'border-black bg-neutral-50/20' : 'border-gray-150 bg-white'} ${isDisabled ? 'opacity-40' : ''}`}>
                              <div className="flex items-center justify-between">
                                <label className={`flex items-center gap-2.5 text-xs font-bold text-black ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={isDisabled}
                                    onChange={() => togglePlatform(plat.id)}
                                    className="h-4 w-4 rounded-sm text-black focus:ring-black accent-black cursor-pointer disabled:cursor-not-allowed"
                                  />
                                  <div className="flex items-center gap-1.5">
                                    {getPlatformIcon(plat.id, "h-4 w-4")}
                                    {plat.label}
                                  </div>
                                </label>
                                {!isConnected && (
                                  <button
                                    onClick={() => handleConnect(plat.id)}
                                    disabled={isDisabled}
                                    className="text-[9px] font-bold text-red-500 bg-red-50 hover:bg-red-100/60 border border-red-100 px-2 py-0.5 rounded-full cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    Connect
                                  </button>
                                )}
                              </div>

                              {/* Dropdown channel selector if connected and checked */}
                              {isChecked && isConnected && (
                                <div className="mt-2.5">
                                  <select
                                    value={selectedAccounts[plat.id] || ''}
                                    onChange={(e) => setSelectedAccounts((prev) => ({ ...prev, [plat.id]: e.target.value }))}
                                    className="w-full bg-white border border-gray-150 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 cursor-pointer"
                                  >
                                    {platformAccounts.map((a) => (
                                      <option key={a.id} value={a.id}>
                                        {a.channelName || a.email}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* DYNAMIC FORM FIELDS */}
                    <div className="space-y-5 border-t border-gray-50 pt-5">
                      
                      {/* YouTube Section */}
                      {selectedPlatforms.youtube && (
                        <div className="p-5 border border-gray-100 rounded-3xl space-y-4 bg-gray-50/10">
                          <h4 className="flex items-center gap-1.5 text-xs font-extrabold text-black uppercase tracking-wider border-b border-gray-50 pb-2">
                            {getPlatformIcon('youtube', "h-4 w-4")}
                            YouTube Publish Options
                          </h4>
                          
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500">Video Title</label>
                            <input
                              type="text"
                              placeholder="YouTube Title..."
                              value={ytTitle}
                              onChange={(e) => setYtTitle(e.target.value)}
                              maxLength={100}
                              className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2 text-xs font-semibold"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500">Description</label>
                            <textarea
                              rows={3}
                              placeholder="YouTube description..."
                              value={ytDescription}
                              onChange={(e) => setYtDescription(e.target.value)}
                              className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2 text-xs font-semibold"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-gray-500">Tags (Comma-separated)</label>
                              <input
                                type="text"
                                placeholder="AI, video..."
                                value={ytTags}
                                onChange={(e) => setYtTags(e.target.value)}
                                className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2 text-xs font-semibold"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-gray-500">Visibility</label>
                              <select
                                value={ytVisibility}
                                onChange={(e) => setYtVisibility(e.target.value as 'public' | 'unlisted' | 'private')}
                                className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer"
                              >
                                <option value="public">Public</option>
                                <option value="unlisted">Unlisted</option>
                                <option value="private">Private</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* LinkedIn Section */}
                      {selectedPlatforms.linkedin && (
                        <div className="p-5 border border-gray-100 rounded-3xl space-y-3 bg-gray-50/10">
                          <h4 className="flex items-center gap-1.5 text-xs font-extrabold text-black uppercase tracking-wider border-b border-gray-50 pb-2">
                            {getPlatformIcon('linkedin', "h-4 w-4")}
                            LinkedIn Post Details
                          </h4>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500">Post Copy</label>
                            <textarea
                              rows={4}
                              placeholder="Write a professional post to accompany this video..."
                              value={liPostText}
                              onChange={(e) => setLiPostText(e.target.value)}
                              className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2 text-xs font-semibold"
                            />
                          </div>
                        </div>
                      )}

                      {/* Facebook Section */}
                      {selectedPlatforms.facebook && (
                        <div className="p-5 border border-gray-100 rounded-3xl space-y-3 bg-gray-50/10">
                          <h4 className="flex items-center gap-1.5 text-xs font-extrabold text-black uppercase tracking-wider border-b border-gray-50 pb-2">
                            {getPlatformIcon('facebook', "h-4 w-4")}
                            Facebook Page Video Caption
                          </h4>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500">Caption</label>
                            <textarea
                              rows={3}
                              placeholder="Write a caption..."
                              value={fbCaption}
                              onChange={(e) => setFbCaption(e.target.value)}
                              className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2 text-xs font-semibold"
                            />
                          </div>
                        </div>
                      )}

                      {/* Instagram Section */}
                      {selectedPlatforms.instagram && (
                        <div className="p-5 border border-gray-100 rounded-3xl space-y-3 bg-gray-50/10">
                          <h4 className="flex items-center gap-1.5 text-xs font-extrabold text-black uppercase tracking-wider border-b border-gray-50 pb-2">
                            {getPlatformIcon('instagram', "h-4 w-4")}
                            Instagram Reel Details
                          </h4>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500">Caption & Hashtags</label>
                            <textarea
                              rows={3}
                              placeholder="Reel caption..."
                              value={igCaption}
                              onChange={(e) => setIgCaption(e.target.value)}
                              className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2 text-xs font-semibold"
                            />
                          </div>
                        </div>
                      )}

                      {/* X (Twitter) Section */}
                      {selectedPlatforms.twitter && (
                        <div className="p-5 border border-gray-100 rounded-3xl space-y-3 bg-gray-50/10">
                          <h4 className="flex items-center gap-1.5 text-xs font-extrabold text-black uppercase tracking-wider border-b border-gray-50 pb-2">
                            {getPlatformIcon('twitter', "h-4 w-4")}
                            X (Twitter) Tweet Copy
                          </h4>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500">Tweet Text</label>
                            <textarea
                              rows={3}
                              placeholder="Write a tweet copy (max 280 characters)..."
                              value={twTweetText}
                              onChange={(e) => setTwTweetText(e.target.value)}
                              maxLength={280}
                              className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2 text-xs font-semibold"
                            />
                            <span className="text-[9px] text-gray-400 text-right block pr-1">
                              {twTweetText.length}/280 characters
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Schedule Post Toggle */}
                      <div className="p-5 border border-gray-100 rounded-3xl bg-gray-50/10 space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-black flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isScheduled}
                              onChange={(e) => {
                                setIsScheduled(e.target.checked);
                                if (e.target.checked && !scheduledDate) {
                                  // Default to tomorrow
                                  const tomorrow = new Date();
                                  tomorrow.setDate(tomorrow.getDate() + 1);
                                  setScheduledDate(tomorrow.toISOString().split('T')[0]);
                                }
                              }}
                              className="h-4 w-4 rounded-sm text-black focus:ring-black accent-black cursor-pointer"
                            />
                            Schedule Post for Later
                          </label>
                          {org?.approvalRequired && (
                            <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Approval Required
                            </span>
                          )}
                        </div>

                        {isScheduled && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-gray-500">Date</label>
                              <input
                                type="date"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2 text-xs font-semibold"
                                required
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-gray-500">Time</label>
                              <input
                                type="time"
                                value={scheduledTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                                className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2 text-xs font-semibold"
                                required
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Publish Submit Action */}
                      <div className="pt-4 border-t border-gray-50">
                        <button
                          onClick={() => publishMutation.mutate()}
                          disabled={publishMutation.isPending || activeUploads.length > 0}
                          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-black text-white hover:bg-neutral-800 disabled:opacity-40 font-extrabold text-sm transition-all cursor-pointer shadow-xs"
                        >
                          {publishMutation.isPending ? (
                            <>
                              <Loader2 className="h-4.5 w-4.5 animate-spin" />
                              {org?.approvalRequired ? 'Submitting request...' : 'Preparing distribution upload...'}
                            </>
                          ) : (
                            <>
                              <UploadCloud className="h-4.5 w-4.5" />
                              {org?.approvalRequired
                                ? 'Submit for Approval'
                                : isScheduled
                                ? 'Schedule Post'
                                : 'Publish to Selected Platforms'}
                            </>
                          )}
                        </button>
                      </div>
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

        {/* Right Column: Preview & Parallel Tracking HUD */}
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

          {/* Active Publishing HUD for tracking multiple items in parallel */}
          <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <CardContent className="p-0 space-y-4">
              <h4 className="font-extrabold text-sm text-black font-sans leading-tight border-b border-gray-50 pb-2">
                Active Publishing HUD
              </h4>

              {activeUploads.length > 0 ? (
                <div className="space-y-5">
                   {activeUploads.map((upload) => {
                    let percent = 0;
                    if (upload.status.startsWith('Uploading:')) {
                      const match = upload.status.match(/\d+/);
                      if (match) percent = parseInt(match[0]);
                    } else if (upload.status.startsWith('Processing')) {
                      percent = 90;
                    } else if (upload.status === 'Published') {
                      percent = 100;
                    }

                    const isSuccess = upload.status === 'Published';
                    const videoUrl = upload.videoUrl;

                    return (
                      <div key={upload.id} className={`p-4 border rounded-2xl space-y-3 ${
                        isSuccess ? 'bg-emerald-50/20 border-emerald-100' : 'bg-neutral-50/50 border-gray-150'
                      }`}>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2 min-w-0">
                            {getPlatformIcon(upload.platform, "h-4 w-4")}
                            <span className="text-xs font-bold text-black truncate max-w-[120px]" title={upload.channelName || 'Account'}>
                              {upload.channelName || 'Account'}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isSuccess
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : upload.status.startsWith('Failed')
                              ? 'bg-red-50 text-red-700 border border-red-100'
                              : 'bg-blue-50 text-blue-700 border border-blue-100'
                          }`}>
                            {isSuccess ? 'Upload Complete' : upload.status.startsWith('Failed') ? 'Failed' : upload.status}
                          </span>
                        </div>

                        {/* Progress Bar & Status Details */}
                        {!isSuccess ? (
                          <div className="space-y-1.5">
                            {upload.status.startsWith('Failed') ? (
                              <div className="text-[11px] font-semibold text-red-600 block mt-1 leading-relaxed">
                                {upload.status.replace('Failed: ', '❌ ')}
                              </div>
                            ) : (
                              <>
                                <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden border border-neutral-150">
                                  <motion.div
                                    className="h-full rounded-full bg-black"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percent}%` }}
                                    transition={{ duration: 0.5 }}
                                  />
                                </div>
                                <span className="text-[9px] text-gray-400 font-bold block text-right">
                                  {percent}% Complete
                                </span>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="pt-2 border-t border-emerald-100/50 space-y-2">
                            <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                              ✅ Upload Successful
                            </div>
                            {videoUrl && (
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-semibold text-gray-500 block">Video URL:</span>
                                <span className="text-[10px] font-mono bg-white border border-gray-150 p-1.5 rounded-lg block truncate select-all">
                                  {videoUrl}
                                </span>
                                <div className="flex gap-2">
                                  <a
                                    href={videoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-extrabold text-black hover:underline inline-flex items-center gap-0.5"
                                  >
                                    View on {upload.platform.charAt(0).toUpperCase() + upload.platform.slice(1)}
                                  </a>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(videoUrl);
                                      alert('Link copied to clipboard!');
                                    }}
                                    className="text-[10px] font-extrabold text-neutral-600 hover:text-black cursor-pointer"
                                  >
                                    Copy Link
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
              { id: 'scheduled', label: 'Scheduled' },
              { id: 'pending', label: 'Pending' },
              { id: 'failed', label: 'Failed' }
            ].map((tab) => {
              const isSelected = historyTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setHistoryTab(tab.id as 'all' | 'published' | 'scheduled' | 'pending' | 'failed')}
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

        {/* History Grid */}
        {filteredHistory.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-gray-150 rounded-3xl bg-neutral-50/30">
            <UploadCloud className="h-9 w-9 text-gray-300 mx-auto mb-3 opacity-60" />
            <h4 className="font-bold text-gray-900 text-sm">No uploads found</h4>
            <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1 font-semibold">
              No videos match the selected filter or no publishing tasks have been initiated yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHistory.map((pv) => {
              // Find matching connected account name
              const matchedAcc = accounts.find((a) => a.id === pv.socialAccountId);
              const channelDisplay = matchedAcc
                ? `${pv.platform.charAt(0).toUpperCase() + pv.platform.slice(1)} - ${matchedAcc.channelName || matchedAcc.email}`
                : pv.platform.charAt(0).toUpperCase() + pv.platform.slice(1);

              return (
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
                        {pv.status.startsWith('Failed') && (
                          <span className="text-[10px] font-bold text-red-500 block mt-1">
                            {pv.status.replace('Failed: ', '❌ ')}
                          </span>
                        )}
                      </div>
                      {getStatusBadge(pv.status)}
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-600 bg-neutral-50 border border-neutral-150 px-2.5 py-0.5 rounded-full max-w-[60%] truncate" title={channelDisplay}>
                        {getPlatformIcon(pv.platform, "h-3.5 w-3.5")}
                        <span className="truncate">{channelDisplay}</span>
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
                              // Auto check platform and preset account
                              setSelectedPlatforms((prev) => ({ ...prev, [pv.platform]: true }));
                              if (pv.socialAccountId) {
                                setSelectedAccounts((prev) => ({ ...prev, [pv.platform]: pv.socialAccountId! }));
                              }
                              window.scrollTo({ top: 300, behavior: 'smooth' });
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
