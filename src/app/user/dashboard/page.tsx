'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useAppStore } from '@/store/store';
import { useProjects } from '@/hooks/useProjects';
import { 
  FileText, Volume2, Video, Share2, ArrowRight, 
  Coins, Plus, Loader2, Sparkles
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function UserDashboardPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const { setIsCreateModalOpen, openProject } = useAppStore();
  const { data: projects = [], isLoading: isProjectsLoading } = useProjects();

  const [credits, setCredits] = useState<{
    scriptCredits: number;
    voiceCredits: number;
    videoCredits: number;
    publishCredits: number;
    storageLimitGB: number;
    storageUsedGB: number;
  } | null>(null);

  const fetchCredits = async () => {
    try {
      const res = await fetch('/api/user/credits');
      const data = await res.json();
      if (res.ok) setCredits(data.wallet);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  const dashboardProjects = projects.slice(0, 4);

  return (
    <div className="space-y-12 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="space-y-5">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-100">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Ready to Create
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold font-sans tracking-tight text-black">
            Welcome back, {user?.name ? user.name.split(' ')[0] : 'Creator'}
          </h1>
          <p className="text-base text-gray-500 font-sans max-w-xl leading-relaxed">
            Generate scripts, lifelike neural voiceovers, and premium AI-compilations inside one workspace.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-black text-white hover:bg-neutral-800 text-sm font-semibold px-6 py-3 transition-all duration-300 shadow-sm"
          >
            Create New Project
          </button>
          <Link
            href="/user/templates"
            className="inline-flex items-center gap-2 rounded-full bg-neutral-100 text-black hover:bg-neutral-200 text-sm font-semibold px-6 py-3 transition-all duration-300"
          >
            Browse Templates
          </Link>
        </div>
      </div>

      {/* Credit Meters & Action cards row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Card: Quick credits summary */}
        <div className="lg:col-span-4">
          <Card className="rounded-3xl border border-gray-100 bg-white p-6 h-full shadow-xs flex flex-col justify-between">
            <CardContent className="p-0 space-y-6">
              <h3 className="font-bold text-lg text-black font-sans leading-tight">
                Remaining Credits
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Script Tokens</span>
                  <span className="text-xl font-black text-black mt-1">{credits?.scriptCredits ?? 0}</span>
                </div>
                <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Voice Tokens</span>
                  <span className="text-xl font-black text-black mt-1">{credits?.voiceCredits ?? 0}</span>
                </div>
                <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Video Renders</span>
                  <span className="text-xl font-black text-black mt-1">{credits?.videoCredits ?? 0}</span>
                </div>
                <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Social Posts</span>
                  <span className="text-xl font-black text-black mt-1">{credits?.publishCredits ?? 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Cards: Quick action panels */}
        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
            {/* Card 1: Script */}
            <Card 
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <CardContent className="p-0 flex flex-col justify-between h-full space-y-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-50 border border-gray-100 text-gray-500">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-bold text-base text-black font-sans leading-snug">Generate Script</h4>
                  <p className="text-xs text-gray-400 font-sans leading-relaxed">
                    Create compelling narratives from simple text prompts.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-black pt-1">
                  Start Script
                  <ArrowRight className="h-3 w-3" />
                </span>
              </CardContent>
            </Card>

            {/* Card 2: Voice */}
            <Card 
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <CardContent className="p-0 flex flex-col justify-between h-full space-y-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-50 border border-gray-100 text-gray-500">
                  <Volume2 className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-bold text-base text-black font-sans leading-snug">Generate Voice</h4>
                  <p className="text-xs text-gray-400 font-sans leading-relaxed">
                    Convert scripts into neural voiceovers with lifelike personas.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-black pt-1">
                  Start Voice
                  <ArrowRight className="h-3 w-3" />
                </span>
              </CardContent>
            </Card>

            {/* Card 3: Video */}
            <Card 
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <CardContent className="p-0 flex flex-col justify-between h-full space-y-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-50 border border-gray-100 text-gray-500">
                  <Video className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-bold text-base text-black font-sans leading-snug">Generate Video</h4>
                  <p className="text-xs text-gray-400 font-sans leading-relaxed">
                    Compile script and voiceovers into an avatar video presentation.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-black pt-1">
                  Start Video
                  <ArrowRight className="h-3 w-3" />
                </span>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Recent Projects list */}
      <div className="space-y-5">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-xl text-black font-sans leading-tight">
            Recent Projects
          </h3>
          <Link 
            href="/user/projects"
            className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-black transition-colors"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isProjectsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(n => (
              <Card key={n} className="rounded-3xl border border-gray-100 bg-white p-6 h-40 animate-pulse flex flex-col justify-between">
                <div className="h-10 w-10 rounded-xl bg-gray-100" />
                <div className="space-y-2">
                  <div className="h-3.5 w-24 bg-gray-100 rounded" />
                  <div className="h-2.5 w-16 bg-gray-100 rounded" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {dashboardProjects.map((project) => {
              let Icon = FileText;
              let bgPill = 'bg-gray-50 text-gray-600 border-gray-100';
              let label = 'Draft';
              
              if (project.status === 'COMPLETED') {
                Icon = Video;
                bgPill = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                label = 'Video Ready';
              } else if (project.step === 'VOICE') {
                Icon = Volume2;
                bgPill = 'bg-blue-50 text-blue-700 border-blue-100';
                label = 'Voice Ready';
              } else if (project.step === 'SCRIPT') {
                Icon = FileText;
                bgPill = 'bg-gray-50 text-gray-700 border-gray-200';
                label = 'Script Ready';
              }

              return (
                <Link 
                  key={project.id}
                  href={`/user/projects/${project.id}`}
                  className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between h-44"
                >
                  <CardContent className="p-0 flex flex-col justify-between h-full space-y-4">
                    <div className="flex h-12 w-full justify-center items-center rounded-2xl bg-neutral-100 text-gray-400 font-bold border border-neutral-50/50">
                      <Icon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="space-y-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${bgPill}`}>
                        {label}
                      </span>
                      <h4 className="font-bold text-xs text-black truncate block font-sans leading-none">{project.name}</h4>
                      <span className="text-[10px] text-gray-400 font-medium font-sans block">
                        Updated {new Date(project.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </CardContent>
                </Link>
              );
            })}

            {/* Empty fill state */}
            {Array.from({ length: Math.max(0, 4 - dashboardProjects.length) }).map((_, idx) => (
              <Card 
                key={idx}
                onClick={() => setIsCreateModalOpen(true)}
                className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between h-44 border-dashed bg-gray-50/20 hover:bg-gray-50/50"
              >
                <CardContent className="p-0 flex flex-col justify-between h-full space-y-4">
                  <div className="flex h-12 w-full justify-center items-center rounded-2xl bg-neutral-50 border border-dashed border-neutral-200 text-gray-300 font-bold">
                    <Plus className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-400">
                      Draft
                    </span>
                    <h4 className="font-bold text-xs text-gray-400 font-sans leading-none">New Project</h4>
                    <span className="text-[10px] text-gray-300 font-medium font-sans block">Create new pipeline</span>
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
