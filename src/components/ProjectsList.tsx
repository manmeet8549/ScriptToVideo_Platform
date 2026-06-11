'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAppStore } from '@/store/store';
import { useProjects, useDeleteProject, useCreateProject, useUpdateProject } from '@/hooks/useProjects';
import { type Project } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, Trash2, Video, Loader2,
  Zap, Sparkles, Copy, Check, MoreHorizontal,
  Image as ImageIcon, FileText, Volume2, Edit3, Plus
} from 'lucide-react';

export default function ProjectsList() {
  const { searchQuery, setSearchQuery, setAuthView, setIsCreateModalOpen, openProject } = useAppStore();
  const { data: session } = useSession();
  const user = session?.user;

  // API hooks
  const { data: projects = [], isLoading } = useProjects();
  const createMutation = useCreateProject();
  const deleteMutation = useDeleteProject();
  const updateMutation = useUpdateProject();

  // Component states
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'SCRIPT' | 'VOICE' | 'VIDEO'>('ALL');
  const [sortOption, setSortOption] = useState<'UPDATED' | 'NAME' | 'CREATED'>('UPDATED');
  const [quickPrompt, setQuickPrompt] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Handle Quick Create
  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAuthView('login');
      return;
    }
    if (!quickPrompt.trim() || createMutation.isPending) return;

    // Generate a default title from the prompt
    const name = quickPrompt.split(' ').slice(0, 3).join(' ') + '...';
    try {
      await createMutation.mutateAsync({
        name,
        prompt: quickPrompt,
        videoRatio: 'RATIO_16_9',
      });
      setQuickPrompt('');
    } catch (err) {
      console.error('[Quick Create] Error:', err);
    }
  };

  // Handle Copy Prompt
  const handleCopyPrompt = (projectId: string, prompt: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedId(projectId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle Rename Submit
  const handleRenameSubmit = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      await updateMutation.mutateAsync({
        id,
        data: { name: editingName },
      });
      setEditingProjectId(null);
    } catch (err) {
      console.error('[Rename] Error:', err);
    }
  };

  // Get status badge for top-right of preview card
  const getStatusBadge = (project: Project) => {
    if (project.status === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700 uppercase tracking-wider">
          • Video Ready
        </span>
      );
    }
    if (project.step === 'VOICE') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-700 uppercase tracking-wider">
          • Voice Ready
        </span>
      );
    }
    if (project.step === 'SCRIPT') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 border border-neutral-200 px-2 py-0.5 text-[9px] font-bold text-neutral-600 uppercase tracking-wider">
          • Script Ready
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-100 px-2 py-0.5 text-[9px] font-bold text-gray-500 uppercase tracking-wider">
        • Draft
      </span>
    );
  };

  // Get matching icon for the preview block
  const getProjectPreviewIcon = (project: Project) => {
    if (project.status === 'COMPLETED') return <Video className="h-8 w-8 text-neutral-300 group-hover:text-black transition-colors" />;
    if (project.step === 'VOICE') return <Volume2 className="h-8 w-8 text-neutral-300 group-hover:text-black transition-colors" />;
    if (project.step === 'SCRIPT') return <FileText className="h-8 w-8 text-neutral-300 group-hover:text-black transition-colors" />;
    return <ImageIcon className="h-8 w-8 text-neutral-200" />;
  };

  // Formatting date/time helper
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hr' : 'hrs'} ago`;
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  };

  // Filtering list
  const filteredProjects = projects
    .filter((project) => {
      // Search text match
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        project.name.toLowerCase().includes(query) ||
        project.prompt.toLowerCase().includes(query);

      // Status pill match
      if (!matchesSearch) return false;
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'DRAFT') return project.status === 'DRAFT';
      if (statusFilter === 'SCRIPT') return project.step === 'SCRIPT';
      if (statusFilter === 'VOICE') return project.step === 'VOICE';
      if (statusFilter === 'VIDEO') return project.status === 'COMPLETED';
      return true;
    })
    .sort((a, b) => {
      if (sortOption === 'NAME') return a.name.localeCompare(b.name);
      if (sortOption === 'CREATED') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-24 space-y-10">
      {/* 1. Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 border border-neutral-200/50 px-2.5 py-0.5 text-xs font-semibold text-neutral-600">
            Projects
          </span>
          <h2 className="text-3xl font-extrabold font-sans tracking-tight text-black">
            Your Projects
          </h2>
          <p className="text-sm text-gray-500 font-sans max-w-xl mt-0.5">
            Manage scripts, voiceovers, and AI video productions across your workspace.
          </p>
        </div>

        <button
          onClick={() => {
            if (!user) {
              setAuthView('login');
            } else {
              setIsCreateModalOpen(true);
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-black text-white hover:bg-neutral-800 text-xs font-bold px-5 py-3 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {/* 2. Quick Create Card */}
      <Card className="rounded-[32px] border border-gray-100 bg-white p-8 shadow-sm">
        <CardContent className="p-0 space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-black font-sans flex items-center gap-1.5">
              <Zap className="h-4.5 w-4.5 text-black" />
              Quick Create
            </h3>
            <p className="text-xs text-gray-400 font-sans">
              Instantly generate a full project outline from a single prompt.
            </p>
          </div>

          <form onSubmit={handleQuickCreate} className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Describe your video idea (e.g., 'Create a 60-second video explaining quantum computing')..."
                value={quickPrompt}
                onChange={(e) => setQuickPrompt(e.target.value)}
                className="pl-10 pr-4 rounded-full border-gray-200 focus:border-black focus:ring-black h-11 text-sm bg-white"
              />
            </div>
            <Button
              type="submit"
              disabled={createMutation.isPending || !quickPrompt.trim()}
              className="bg-neutral-100 text-black hover:bg-neutral-200 border border-neutral-200/40 rounded-full px-6 h-11 text-xs font-bold w-full sm:w-auto transition-colors"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin text-black" />
              ) : (
                'Generate Project'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 3. Toolbar (Search, Filter, Sort) */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 border-b border-gray-50 pb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 rounded-full border-gray-200 focus:border-black focus:ring-black h-10 text-sm bg-white"
          />
        </div>

        {/* Filter & Sort */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Status Pills */}
          <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-gray-50/50 border border-gray-100">
            {(['ALL', 'DRAFT', 'SCRIPT', 'VOICE', 'VIDEO'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  statusFilter === status 
                    ? 'bg-black text-white' 
                    : 'text-gray-500 hover:text-black hover:bg-white'
                }`}
              >
                {status === 'ALL' && 'All'}
                {status === 'DRAFT' && 'Draft'}
                {status === 'SCRIPT' && 'Script Ready'}
                {status === 'VOICE' && 'Voice Ready'}
                {status === 'VIDEO' && 'Video Ready'}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as 'UPDATED' | 'NAME' | 'CREATED')}
              className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-8 text-xs font-semibold text-gray-600 hover:border-black focus:outline-none focus:ring-1 focus:ring-black cursor-pointer h-10"
            >
              <option value="UPDATED">Recently Updated</option>
              <option value="NAME">Name (A-Z)</option>
              <option value="CREATED">Created Date</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">▼</span>
          </div>
        </div>
      </div>

      {/* 4. Projects Cards Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
          <p className="text-sm text-gray-500 font-sans">Loading your projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-[32px] border border-dashed border-gray-200 bg-white text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-50 border border-neutral-100 text-gray-400 mb-4">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-lg text-black font-sans">No projects found</h3>
          <p className="text-sm text-gray-500 max-w-xs mt-1 font-sans">
            Try adjusting your filters or search query, or create a new project.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {filteredProjects.map((project) => (
            <Card 
              key={project.id}
              className="rounded-[32px] border border-gray-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
            >
              <div 
                onClick={() => {
                  if (!user) {
                    setAuthView('login');
                  } else {
                    openProject(project.id);
                  }
                }}
                className="bg-neutral-100 h-44 relative flex items-center justify-center cursor-pointer border-b border-gray-50 overflow-hidden"
              >
                {(() => {
                  const video = project.videos?.[0];
                  if (video?.thumbnailUrl) {
                    console.log(`[PROJECT_CARD_THUMBNAIL] Project: "${project.name}" (ID: ${project.id}), Video ID: ${video.id}, Thumbnail URL: ${video.thumbnailUrl}`);
                    return (
                      <div className="relative w-full h-full bg-neutral-950 flex items-center justify-center overflow-hidden">
                        <Image 
                          src={video.thumbnailUrl} 
                          alt="" 
                          fill
                          unoptimized
                          className="absolute inset-0 w-full h-full object-cover blur-md opacity-30 select-none pointer-events-none" 
                        />
                        <Image 
                          src={video.thumbnailUrl} 
                          alt={project.name} 
                          fill
                          unoptimized
                          className="relative z-10 object-contain select-none pointer-events-none transition-transform duration-300 group-hover:scale-105" 
                        />
                      </div>
                    );
                  }
                  console.log(`[PROJECT_CARD_THUMBNAIL] No thumbnail found for project: "${project.name}" (ID: ${project.id}). Rendering placeholder.`);
                  return getProjectPreviewIcon(project);
                })()}
                
                {/* Status Badge */}
                <div className="absolute top-4 right-4 z-20">
                  {getStatusBadge(project)}
                </div>
              </div>

              {/* Bottom half info */}
              <div className="p-6 flex flex-col justify-between flex-grow space-y-4">
                <div className="space-y-1.5">
                  {editingProjectId === project.id ? (
                    <div className="flex gap-2 items-center">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-8 text-sm border-gray-200 focus:border-black focus:ring-black rounded-lg"
                        onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit(project.id)}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className="bg-black text-white h-8 hover:bg-neutral-800 rounded-lg text-xs"
                        onClick={() => handleRenameSubmit(project.id)}
                      >
                        Save
                      </Button>
                    </div>
                  ) : (
                    <h4 className="font-bold text-base text-black font-sans leading-tight group-hover:text-neutral-800 transition-colors truncate">
                      {project.name}
                    </h4>
                  )}
                  <p className="text-xs text-gray-400 leading-relaxed font-sans line-clamp-2">
                    {project.prompt}
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  {/* Metadata line */}
                  <div className="text-[10px] text-gray-400 font-medium font-sans flex flex-wrap items-center gap-1.5">
                    <span>Updated {getRelativeTime(project.updatedAt)}</span>
                    <span>•</span>
                    <span>{project.duration || '--'}</span>
                    <span>•</span>
                    <span>{project.voiceAccent ? 'English' : 'English'}</span>
                  </div>

                  <div className="h-px bg-gray-50" />

                  {/* Actions line */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        if (!user) {
                          setAuthView('login');
                        } else {
                          openProject(project.id);
                        }
                      }}
                      className="text-xs font-bold text-black hover:underline cursor-pointer"
                    >
                      Open Project
                    </button>

                    <div className="flex items-center gap-1">
                      {/* Copy Prompt Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyPrompt(project.id, project.prompt)}
                        className="h-8 w-8 rounded-lg text-gray-400 hover:text-black hover:bg-gray-50"
                        title="Copy prompt"
                      >
                        {copiedId === project.id ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>

                      {/* Dropdown Options */}
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 rounded-lg text-gray-400 hover:text-black hover:bg-gray-50 flex items-center justify-center cursor-pointer outline-none">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border border-gray-100 p-1 shadow-md bg-white">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingProjectId(project.id);
                              setEditingName(project.name);
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-gray-400" />
                            Rename Project
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(project.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}

