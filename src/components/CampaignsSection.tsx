import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Layers, Plus, Trash2, Video, Calendar, CheckCircle2, AlertCircle, Loader2, Info
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface CampaignItem {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  videos: Array<{
    id: string;
    title: string;
    videoUrl: string;
    thumbnailUrl?: string | null;
  }>;
  scheduledPosts: Array<{
    id: string;
    status: string;
    platform: string;
  }>;
}

interface VideoItem {
  id: string;
  title: string;
  videoUrl: string;
}

export default function CampaignsSection() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);

  // Creation Form States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [campName, setCampName] = useState('');
  const [campDesc, setCampDesc] = useState('');
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Fetch Campaigns
  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Fetch videos for campaign selection
  const { data: videosData } = useQuery<{ videos: VideoItem[] }>({
    queryKey: ['videos'],
    queryFn: async () => {
      const res = await fetch('/api/videos');
      if (!res.ok) throw new Error('Failed to fetch videos');
      return res.json();
    },
  });
  const videos = videosData?.videos ?? [];

  // Fetch specific campaign dashboard detail
  const handleSelectCampaign = async (id: string) => {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCampaign(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit campaign creation
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campName) return;
    setCreating(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campName,
          description: campDesc,
          videoIds: selectedVideoIds
        })
      });
      if (res.ok) {
        alert('Campaign created!');
        setCampName('');
        setCampDesc('');
        setSelectedVideoIds([]);
        setIsCreateOpen(false);
        fetchCampaigns();
      } else {
        alert('Failed to create campaign.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCampaign = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this campaign? Videos will remain in library.')) return;
    try {
      const res = await fetch(`/api/campaigns?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCampaigns();
        if (selectedCampaign?.campaign?.id === id) {
          setSelectedCampaign(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVideoSelectToggle = (id: string) => {
    setSelectedVideoIds(prev =>
      prev.includes(id) ? prev.filter(vId => vId !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-1">
      {/* Title Header */}
      <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-black flex items-center gap-3">
            Campaign Management
          </h1>
          <p className="text-sm text-gray-500 font-sans mt-1">
            Group videos and scheduled posts into unified marketing campaigns.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="rounded-xl bg-black text-white hover:bg-neutral-800 text-xs font-bold px-4 py-2 cursor-pointer flex items-center gap-2 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-xs font-sans">
        {/* Left column: Campaigns lists */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <CardContent className="p-0 space-y-4">
              <h3 className="font-extrabold text-lg text-black font-sans border-b pb-3">Campaign Folders</h3>
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1 scrollbar-thin">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                  </div>
                ) : campaigns.length > 0 ? (
                  campaigns.map((camp) => {
                    const isSelected = selectedCampaign?.campaign?.id === camp.id;
                    return (
                      <div
                        key={camp.id}
                        onClick={() => handleSelectCampaign(camp.id)}
                        className={`p-4 border rounded-2xl flex justify-between items-center cursor-pointer transition-all hover:bg-neutral-50/50 ${isSelected ? 'border-black bg-neutral-50/10 shadow-inner' : 'border-gray-150 bg-white shadow-2xs'}`}
                      >
                        <div className="space-y-1 max-w-[80%]">
                          <h4 className="font-extrabold text-black text-sm">{camp.name}</h4>
                          <p className="text-gray-500 truncate" title={camp.description || ''}>{camp.description || 'No description'}</p>
                          <div className="flex gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1.5">
                            <span>{camp.videos.length} videos</span>
                            <span>•</span>
                            <span>{camp.scheduledPosts.length} posts</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteCampaign(camp.id, e)}
                          className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-16 border border-dashed border-gray-150 rounded-2xl bg-neutral-50/20">
                    <Layers className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-xs font-semibold text-gray-400">No campaigns created yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Selected Campaign Dashboard details */}
        <div className="lg:col-span-7">
          {selectedCampaign ? (
            <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
              <div className="border-b pb-3 space-y-1">
                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">Campaign Folder</span>
                <h3 className="font-extrabold text-xl text-black font-sans leading-tight mt-1">{selectedCampaign.campaign.name}</h3>
                <p className="text-gray-500 font-medium">{selectedCampaign.campaign.description || 'No description provided.'}</p>
              </div>

              {/* Campaign KPI Metrics Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-neutral-50 p-4 border rounded-2xl flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Videos</span>
                  <span className="text-2xl font-black text-black mt-1">{selectedCampaign.metrics.totalVideos}</span>
                </div>
                <div className="bg-neutral-50 p-4 border rounded-2xl flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Scheduled</span>
                  <span className="text-2xl font-black text-blue-600 mt-1">{selectedCampaign.metrics.scheduled}</span>
                </div>
                <div className="bg-neutral-50 p-4 border rounded-2xl flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Published</span>
                  <span className="text-2xl font-black text-emerald-600 mt-1">{selectedCampaign.metrics.published}</span>
                </div>
                <div className="bg-neutral-50 p-4 border rounded-2xl flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Failed</span>
                  <span className="text-2xl font-black text-rose-600 mt-1">{selectedCampaign.metrics.failed}</span>
                </div>
              </div>

              {/* Campaign Performance Box */}
              {selectedCampaign.metrics.published > 0 && (
                <div className="p-4 bg-indigo-50/20 border border-indigo-100 rounded-3xl space-y-3">
                  <h4 className="font-extrabold text-sm text-black flex items-center gap-2">
                    <Layers className="h-4.5 w-4.5 text-indigo-600" />
                    Simulated Social Reach Summary
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white p-2 border rounded-xl flex flex-col">
                      <span className="text-gray-400 font-semibold">Total Views</span>
                      <span className="font-extrabold text-black mt-0.5">{selectedCampaign.metrics.views.toLocaleString()}</span>
                    </div>
                    <div className="bg-white p-2 border rounded-xl flex flex-col">
                      <span className="text-gray-400 font-semibold">Total Likes</span>
                      <span className="font-extrabold text-black mt-0.5">{selectedCampaign.metrics.likes.toLocaleString()}</span>
                    </div>
                    <div className="bg-white p-2 border rounded-xl flex flex-col">
                      <span className="text-gray-400 font-semibold">Total Comments</span>
                      <span className="font-extrabold text-black mt-0.5">{selectedCampaign.metrics.comments.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Linked Videos List */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-sm text-neutral-800">Associated Videos</h4>
                <div className="divide-y border border-neutral-100 rounded-2xl overflow-hidden bg-white">
                  {selectedCampaign.videos.length > 0 ? (
                    selectedCampaign.videos.map((vid: any) => (
                      <div key={vid.id} className="flex justify-between items-center p-3 bg-white text-xs hover:bg-neutral-50">
                        <span className="font-bold text-black truncate max-w-[80%]">{vid.title}</span>
                        <a
                          href={vid.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-indigo-600 hover:underline shrink-0"
                        >
                          View Video
                        </a>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-400 font-semibold bg-gray-50/20">
                      No videos linked to this campaign.
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-24 text-center border border-dashed border-gray-150 rounded-3xl bg-neutral-50/25">
              <Layers className="h-12 w-12 text-gray-300 mb-3" />
              <h3 className="font-extrabold text-sm text-neutral-800">No Campaign Selected</h3>
              <p className="text-xs text-gray-400 max-w-[220px] mx-auto mt-1 leading-relaxed">
                Click a campaign folder in the list to examine associated video assets, scheduled queues, and performance metrics.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Campaign Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-neutral-100 shadow-2xl p-6 max-w-md w-full space-y-6 relative animate-in zoom-in-95 duration-200">
            <div>
              <h2 className="text-lg font-black text-black font-sans">Create Campaign Folder</h2>
              <p className="text-xs text-gray-500 mt-1 font-sans">Group videos into unified social campaign tags.</p>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs font-sans">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Campaign Name</label>
                <input
                  type="text"
                  placeholder="e.g. Q4 Launch, Product Promo"
                  value={campName}
                  onChange={(e) => setCampName(e.target.value)}
                  className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2.5 font-semibold text-gray-700 focus:ring-1 focus:ring-black"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Description</label>
                <textarea
                  rows={2}
                  placeholder="Write a brief purpose..."
                  value={campDesc}
                  onChange={(e) => setCampDesc(e.target.value)}
                  className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2 font-semibold text-gray-700"
                />
              </div>

              {/* Multi video selector checkboxes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Link Videos</label>
                <div className="border border-neutral-100 rounded-xl max-h-40 overflow-y-auto divide-y p-2 space-y-1 bg-neutral-50/50">
                  {videos.length > 0 ? (
                    videos.map(vid => (
                      <label key={vid.id} className="flex items-center gap-2 p-1 cursor-pointer font-semibold text-black">
                        <input
                          type="checkbox"
                          checked={selectedVideoIds.includes(vid.id)}
                          onChange={() => handleVideoSelectToggle(vid.id)}
                          className="h-3.5 w-3.5 rounded-sm text-black focus:ring-black accent-black"
                        />
                        <span className="truncate flex-1">{vid.title}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-[10px] text-gray-400 italic text-center py-4">No videos available to select.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-50">
                <Button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="w-full rounded-xl border border-gray-150 bg-white text-gray-500 hover:text-black hover:bg-neutral-50 px-4 py-2.5 font-bold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="w-full rounded-xl bg-black text-white hover:bg-neutral-800 px-4 py-2.5 font-bold cursor-pointer flex justify-center items-center gap-1 shadow-xs"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
