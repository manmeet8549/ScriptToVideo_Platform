'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useProject, useUpdateProject, PROJECT_KEYS } from '@/hooks/useProjects';
import { useAppStore } from '@/store/store';
import { useQueryClient } from '@tanstack/react-query';
import {
  generateApi,
  avatarsApi,
  type HeyGenAvatar,
} from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, FileText, Volume2, Video, CheckCircle2,
  Loader2, Sparkles, Play, Pause, RefreshCw, Copy, Check,
  AlertCircle, ChevronDown, User2, Download,
  ExternalLink, Clock, HelpCircle, Save
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ─── Helpers for prompt parsing ───────────────────────────────────────────────

interface ParsedPrompt {
  concept: string;
  audience: string;
  tone: string;
  duration: string;
}

function parseProjectPrompt(promptText: string): ParsedPrompt {
  try {
    if (promptText && promptText.startsWith('{') && promptText.endsWith('}')) {
      const parsed = JSON.parse(promptText);
      return {
        concept: parsed.concept || '',
        audience: parsed.audience || '',
        tone: parsed.tone || '',
        duration: parsed.duration || '',
      };
    }
  } catch {
    // ignore
  }
  return {
    concept: promptText || '',
    audience: 'Tech Enthusiasts, General Public',
    tone: 'Educational, Optimistic',
    duration: '~3:45 minutes',
  };
}

function serializeProjectPrompt(concept: string, audience: string, tone: string, duration: string): string {
  return JSON.stringify({ concept, audience, tone, duration });
}

// ─── Voice configurations matching mockup ─────────────────────────────────────

const PREMIUM_VOICES = [
  {
    id: 'pNInz6obpgq5qcGbe82U', // Adam (Default Deep Male)
    name: 'Marcus',
    role: 'Professional Male · Narrator',
    badges: ['DEEP', 'AUTHORITATIVE'],
    avatarLetter: 'M'
  },
  {
    id: 'yTmS7gBZincbjEfc9hnC', // Custom Voice
    name: 'Munish Mittal',
    role: 'Premium Male · Special Character',
    badges: ['SPECIAL', 'CUSTOM'],
    avatarLetter: 'M'
  },
  {
    id: 'EXAVITQu4vr4xnSDxMaL', // Rachel (Default Warm Female)
    name: 'Elena',
    role: 'Friendly Female · Conversational',
    badges: ['WARM', 'ENGAGING'],
    avatarLetter: 'E'
  },
  {
    id: 'AZnzlk1XyvUeBnMexdQD', // Lilli (Clear Female)
    name: 'Sofia',
    role: 'Professional Female · News Anchor',
    badges: ['CLEAR', 'FORMAL'],
    avatarLetter: 'S'
  },
  {
    id: 'VR6AaeYgYWMpfihcE4GC', // Clyde (Energetic Male)
    name: 'Julian',
    role: 'Youthful Male · Energetic',
    badges: ['UPBEAT', 'BRIGHT'],
    avatarLetter: 'J'
  }
];

// ─── Step progress configurations ──────────────────────────────────────────────

const PIPELINE_STEPS = [
  { label: 'Idea', index: 1 },
  { label: 'Script', index: 2 },
  { label: 'Voice', index: 3 },
  { label: 'Video', index: 4 },
  { label: 'Export', index: 5 },
];

// ─── Audio Player ─────────────────────────────────────────────────────────────

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play();
      setPlaying(true);
    }
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-gray-50 border border-gray-100 p-3">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={(e) => setProgress((e.currentTarget.currentTime / (duration || 1)) * 100)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
      />
      <button
        onClick={toggle}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white hover:bg-neutral-800 transition-colors"
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
      </button>
      <div className="flex-1 space-y-1">
        <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-black transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 font-medium">
          <span>{duration ? fmt((progress / 100) * duration) : '0:00'}</span>
          <span>{duration ? fmt(duration) : '--:--'}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; cls: string }> = {
    DRAFT:      { label: 'Draft',      cls: 'bg-gray-50 text-gray-500 border-gray-100' },
    SCRIPTING:  { label: 'Scripting',  cls: 'bg-amber-50 text-amber-600 border-amber-100' },
    VOICING:    { label: 'Voicing',    cls: 'bg-blue-50 text-blue-600 border-blue-100' },
    GENERATING: { label: 'Rendering',  cls: 'bg-purple-50 text-purple-600 border-purple-100' },
    COMPLETED:  { label: 'Completed',  cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    FAILED:     { label: 'Failed',     cls: 'bg-red-50 text-red-600 border-red-100' },
  };
  const c = configs[status] ?? { label: status, cls: 'bg-gray-50 text-gray-500 border-gray-100' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${c.cls}`}>
      {c.label}
    </span>
  );
}

// ─── Main Pipeline Component ──────────────────────────────────────────────────

export default function ProjectPipeline() {
  const { selectedProjectId, setActiveTab } = useAppStore();
  const queryClient = useQueryClient();
  const updateProject = useUpdateProject();

  const { data: project, isLoading: isProjectLoading } = useProject(
    selectedProjectId ?? ''
  );

  // Active step navigation (1 to 5) from Zustand store
  const { activeStepIndex, setActiveStepIndex } = useAppStore();

  // Step state status map
  const [stepStatus, setStepStatus] = useState<Record<string, 'idle' | 'loading' | 'done' | 'error'>>({
    script: 'idle',
    voice: 'idle',
    video: 'idle',
  });
  const [stepErrors, setStepErrors] = useState<Record<string, string | undefined>>({});

  // Generated results
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  // Form fields for Step 1 (Idea)
  const [ideaConcept, setIdeaConcept] = useState('');
  const [ideaAudience, setIdeaAudience] = useState('');
  const [ideaTone, setIdeaTone] = useState('');
  const [ideaDuration, setIdeaDuration] = useState('');

  // Voice configurations (Step 3)
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(PREMIUM_VOICES[0].id);
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);
  const [voicePitch, setVoicePitch] = useState<number>(0);
  const [voiceEmotion, setVoiceEmotion] = useState<string>('Professional & Calm');
  const [isScriptPreviewOpen, setIsScriptPreviewOpen] = useState(false);

  // Avatar selections (Step 4)
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('');
  const [videoRatio, setVideoRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [avatars, setAvatars] = useState<HeyGenAvatar[]>([]);
  const [avatarsLoading, setAvatarsLoading] = useState(false);
  const [videoPollingActive, setVideoPollingActive] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // UI status helpers
  const [copiedScript, setCopiedScript] = useState(false);

  // Sync DB details to frontend state
  useEffect(() => {
    if (!project) return;

    // Parse prompt values
    const parsed = parseProjectPrompt(project.prompt);
    setIdeaConcept((curr) => curr || parsed.concept);
    setIdeaAudience((curr) => curr || parsed.audience || 'Tech Enthusiasts, General Public');
    setIdeaTone((curr) => curr || parsed.tone || 'Educational, Optimistic');
    setIdeaDuration((curr) => curr || parsed.duration || '~3:45 minutes');

    // Sync values
    if (project.scriptText) {
      setGeneratedScript(project.scriptText);
      setStepStatus((s) => ({ ...s, script: 'done' }));
    }
    if (project.step === 'VOICE' || project.step === 'VIDEO') {
      setStepStatus((s) => ({ ...s, script: 'done', voice: 'done' }));
    }
    if (project.status === 'COMPLETED' && project.videoUrl && !project.videoUrl.startsWith('heygen:')) {
      setGeneratedVideoUrl(project.videoUrl);
      setStepStatus((s) => ({ ...s, script: 'done', voice: 'done', video: 'done' }));
    }
    if (project.status === 'GENERATING' || project.videoUrl?.startsWith('heygen:')) {
      setStepStatus((s) => ({ ...s, video: 'loading' }));
      setVideoPollingActive(true);
    }

    // Set fallback selected avatar if ratio is there
    if (project.videoRatio) {
      const displayRatio = project.videoRatio.replace('RATIO_', '').replace('_', ':') as '16:9' | '9:16' | '1:1';
      setVideoRatio(displayRatio);
    }

    // Default step calculation
    if (activeStepIndex === null) {
      let step = 1;
      if (project.status === 'COMPLETED' && project.videoUrl && !project.videoUrl.startsWith('heygen:')) {
        step = 5;
      } else if (project.status === 'GENERATING' || project.videoUrl?.startsWith('heygen:')) {
        step = 4;
      } else if (project.step === 'VOICE' || project.step === 'VIDEO') {
        step = 3;
      } else if (project.scriptText) {
        step = 2;
      }
      setActiveStepIndex(step);
    }
  }, [project, activeStepIndex, setActiveStepIndex]);

  // Load avatar profiles on step 4
  useEffect(() => {
    if (!project) return;
    (async () => {
      setAvatarsLoading(true);
      try {
        const res = await avatarsApi.list();
        setAvatars(res.avatars.slice(0, 12));
        if (res.avatars.length > 0) {
          setSelectedAvatarId(res.avatars[0].avatar_id);
        }
      } catch { /* key not configured */ }
      finally { setAvatarsLoading(false); }
    })();
  }, [project]);

  // Max unlocked step logic
  let maxUnlockedStep = 1;
  if (project?.scriptText) maxUnlockedStep = 2;
  if (project?.step === 'VOICE' || project?.step === 'VIDEO') maxUnlockedStep = 3;
  if (project?.status === 'GENERATING' || project?.videoUrl?.startsWith('heygen:')) maxUnlockedStep = 4;
  if (project?.status === 'COMPLETED' && project?.videoUrl && !project?.videoUrl.startsWith('heygen:')) maxUnlockedStep = 5;

  const handleStepClick = (idx: number) => {
    if (idx <= maxUnlockedStep) {
      setActiveStepIndex(idx);
    }
  };

  // Poll HeyGen status
  const pollVideoStatus = useCallback(async () => {
    if (!selectedProjectId) return;
    try {
      const result = await generateApi.getVideoStatus(selectedProjectId);
      if (result.status === 'completed' && result.videoUrl) {
        setGeneratedVideoUrl(result.videoUrl);
        setStepStatus((s) => ({ ...s, video: 'done' }));
        setVideoPollingActive(false);
        setActiveStepIndex(5); // automatic advance to Export
        queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(selectedProjectId) });
      } else if (result.status === 'failed') {
        setStepErrors((e) => ({ ...e, video: result.error ?? 'Video generation failed' }));
        setStepStatus((s) => ({ ...s, video: 'error' }));
        setVideoPollingActive(false);
      }
    } catch { /* fail safe polling */ }
  }, [selectedProjectId, queryClient, setActiveStepIndex]);

  useEffect(() => {
    if (videoPollingActive) {
      pollingRef.current = setInterval(pollVideoStatus, 10_000);
      pollVideoStatus();
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [videoPollingActive, pollVideoStatus]);

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const handleSaveIdeaDetails = async () => {
    if (!selectedProjectId) return;
    try {
      const serialized = serializeProjectPrompt(ideaConcept, ideaAudience, ideaTone, ideaDuration);
      await updateProject.mutateAsync({
        id: selectedProjectId,
        data: {
          prompt: serialized,
          ...(generatedScript !== null && generatedScript !== undefined ? { scriptText: generatedScript } : {}),
        },
      });
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(selectedProjectId) });
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleGenerateScript = async () => {
    if (!selectedProjectId) return;
    setStepStatus((s) => ({ ...s, script: 'loading' }));
    setStepErrors((e) => ({ ...e, script: undefined }));
    try {
      // 1. Save input values to database
      const serialized = serializeProjectPrompt(ideaConcept, ideaAudience, ideaTone, ideaDuration);
      await updateProject.mutateAsync({
        id: selectedProjectId,
        data: { prompt: serialized },
      });

      // 2. Call NIM generation proxy
      const result = await generateApi.generateScript(selectedProjectId);
      setGeneratedScript(result.script);
      setStepStatus((s) => ({ ...s, script: 'done' }));
      
      // Advance to Script page
      setActiveStepIndex(2);
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(selectedProjectId) });
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Script generation failed';
      setStepErrors((e) => ({ ...e, script: msg }));
      setStepStatus((s) => ({ ...s, script: 'error' }));
    }
  };

  const handleGenerateVoice = async () => {
    if (!selectedProjectId) return;
    setStepStatus((s) => ({ ...s, voice: 'loading' }));
    setStepErrors((e) => ({ ...e, voice: undefined }));
    try {
      // Optionally save speed, pitch, emotion if DB supported (not required, ElevenLabs takes selectedVoiceId)
      const result = await generateApi.generateVoice(selectedProjectId, selectedVoiceId);
      setGeneratedAudio(result.audioUrl);
      setStepStatus((s) => ({ ...s, voice: 'done' }));
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(selectedProjectId) });
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Voice generation failed';
      setStepErrors((e) => ({ ...e, voice: msg }));
      setStepStatus((s) => ({ ...s, voice: 'error' }));
    }
  };

  const handleGenerateVideo = async () => {
    if (!selectedProjectId) return;
    setStepStatus((s) => ({ ...s, video: 'loading' }));
    setStepErrors((e) => ({ ...e, video: undefined }));
    try {
      // Map display ratio string back to Db enum
      const dbRatioMap = {
        '16:9': 'RATIO_16_9',
        '9:16': 'RATIO_9_16',
        '1:1': 'RATIO_1_1'
      } as const;

      await updateProject.mutateAsync({
        id: selectedProjectId,
        data: { videoRatio: dbRatioMap[videoRatio] }
      });

      await generateApi.generateVideo({
        projectId: selectedProjectId,
        avatarId: selectedAvatarId || undefined,
      });

      setVideoPollingActive(true);
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(selectedProjectId) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Video generation failed';
      setStepErrors((e) => ({ ...e, video: msg }));
      setStepStatus((s) => ({ ...s, video: 'error' }));
    }
  };

  const handleCopyScript = () => {
    if (!generatedScript) return;
    navigator.clipboard.writeText(generatedScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  if (isProjectLoading || !project || activeStepIndex === null) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <div className="h-6 w-48 rounded bg-gray-150" />
        <div className="h-4 w-32 rounded bg-gray-150" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-96 rounded-3xl bg-gray-100" />
          <div className="h-96 rounded-3xl bg-gray-100" />
        </div>
      </div>
    );
  }

  const selectedVoiceName = PREMIUM_VOICES.find(v => v.id === selectedVoiceId)?.name || 'Marcus';

  return (
    <div className="space-y-8 pb-12 font-sans">
      <style>{`
        @keyframes voiceBar {
          0%, 100% { transform: scaleY(0.2); }
          50% { transform: scaleY(1); }
        }
        .animate-voice-bar {
          animation: voiceBar 1.2s ease-in-out infinite;
          transform-origin: bottom;
        }
      `}</style>

      {/* Top Bar with Navigation & Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
        <div className="space-y-1">
          <button
            onClick={() => setActiveTab('projects')}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-black font-semibold transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Projects
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-black tracking-tight">{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSaveIdeaDetails}
            disabled={updateProject.isPending}
            className="rounded-xl border-gray-200 text-xs font-semibold h-10 px-4 flex items-center gap-1.5"
          >
            {updateProject.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
          <Button
            onClick={() => {
              if (generatedVideoUrl) {
                window.open(generatedVideoUrl, '_blank');
              }
            }}
            disabled={!generatedVideoUrl}
            className="rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-semibold h-10 px-5"
          >
            Export
          </Button>
        </div>
      </div>

      {/* Step Progress Tracker bar */}
      <div className="flex justify-between items-center max-w-3xl mx-auto px-4 py-2 bg-white rounded-3xl border border-gray-50 shadow-xs">
        {PIPELINE_STEPS.map((step, idx) => {
          const isDone = step.index < activeStepIndex;
          const isActive = step.index === activeStepIndex;
          const isLocked = step.index > maxUnlockedStep;

          return (
            <div key={step.label} className="flex items-center flex-1 last:flex-none">
              {idx > 0 && (
                <div className={`flex-1 h-0.5 mx-1 md:mx-4 transition-colors ${
                  step.index <= activeStepIndex ? 'bg-black' : 'bg-gray-100'
                }`} />
              )}
              
              <button
                onClick={() => handleStepClick(step.index)}
                disabled={isLocked}
                className={`flex flex-col items-center gap-1 focus:outline-none transition-all group ${
                  isLocked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:scale-105'
                }`}
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                  isDone
                    ? 'bg-black border-black text-white'
                    : isActive
                    ? 'bg-white border-black text-black ring-4 ring-neutral-100'
                    : 'bg-white border-gray-200 text-gray-400'
                }`}>
                  {isDone ? (
                    <Check className="h-4 w-4 stroke-[3]" />
                  ) : (
                    step.index
                  )}
                </div>
                <span className={`text-[10px] font-extrabold tracking-wide uppercase mt-1 hidden sm:block ${
                  isActive ? 'text-black font-extrabold' : 'text-gray-400 font-bold'
                }`}>
                  {step.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Active Step Panel */}
        <div className="lg:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: IDEA */}
            {activeStepIndex === 1 && (
              <motion.div
                key="step-idea"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="rounded-[32px] border border-gray-100 shadow-sm bg-white overflow-hidden p-8 space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="font-extrabold text-xl text-black">Describe Your Video</h2>
                      <p className="text-xs text-gray-400 mt-1">Provide a description of your concept to kick off the AI pipeline.</p>
                    </div>
                    <button className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-600 border border-neutral-200/50 hover:bg-neutral-200 transition-colors">
                      <Sparkles className="h-3 w-3 text-black" />
                      Use Magic Prompt
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Prompt Box */}
                    <div className="relative">
                      <textarea
                        rows={6}
                        placeholder="I want to create a video about..."
                        value={ideaConcept}
                        onChange={(e) => setIdeaConcept(e.target.value)}
                        className="flex w-full rounded-2xl border border-gray-200 bg-transparent px-4 py-3 text-sm shadow-xs placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black resize-none font-sans"
                      />
                      <span className="absolute bottom-3 right-4 text-[10px] font-bold text-gray-400">
                        {ideaConcept.length} / 2000 words
                      </span>
                    </div>

                    {/* Additional Settings Grid */}
                    <div className="space-y-3.5 pt-2">
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Project Details</h4>
                      
                      <div className="space-y-3">
                        {/* Target Audience */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-gray-500 uppercase">Target Audience</label>
                          <input
                            type="text"
                            placeholder="e.g. Tech Enthusiasts, General Public"
                            value={ideaAudience}
                            onChange={(e) => setIdeaAudience(e.target.value)}
                            className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black font-sans"
                          />
                        </div>

                        {/* Tone */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-gray-500 uppercase">Tone</label>
                          <input
                            type="text"
                            placeholder="e.g. Educational, Optimistic"
                            value={ideaTone}
                            onChange={(e) => setIdeaTone(e.target.value)}
                            className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black font-sans"
                          />
                        </div>

                        {/* Estimated Duration */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-gray-500 uppercase">Estimated Duration</label>
                          <input
                            type="text"
                            placeholder="e.g. ~3:45 minutes"
                            value={ideaDuration}
                            onChange={(e) => setIdeaDuration(e.target.value)}
                            className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black font-sans"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {stepStatus.script === 'error' && stepErrors.script && (
                    <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-700">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{stepErrors.script}</span>
                    </div>
                  )}

                  <button
                    onClick={handleGenerateScript}
                    disabled={!ideaConcept.trim() || stepStatus.script === 'loading'}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-black text-white hover:bg-neutral-800 font-semibold text-sm h-12 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    {stepStatus.script === 'loading' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating Script...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate Script
                      </>
                    )}
                  </button>
                </Card>
              </motion.div>
            )}

            {/* STEP 2: SCRIPT */}
            {activeStepIndex === 2 && (
              <motion.div
                key="step-script"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="rounded-[32px] border border-gray-100 shadow-sm bg-white overflow-hidden p-8 space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="font-extrabold text-xl text-black">Review Script</h2>
                      <p className="text-xs text-gray-400 mt-1">Read and tweak the generated AI script before voicing.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyScript}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold px-3 py-2 transition-colors"
                      >
                        {copiedScript ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedScript ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={handleGenerateScript}
                        disabled={stepStatus.script === 'loading'}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold px-3 py-2 transition-colors"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${stepStatus.script === 'loading' ? 'animate-spin' : ''}`} />
                        Regenerate
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <textarea
                      rows={12}
                      value={generatedScript || ''}
                      onChange={(e) => setGeneratedScript(e.target.value)}
                      className="flex w-full rounded-2xl border border-gray-200 bg-neutral-50/20 px-4 py-3.5 text-sm font-sans leading-relaxed text-gray-700 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black resize-none"
                    />
                  </div>

                  <button
                    onClick={async () => {
                      if (!selectedProjectId || !generatedScript) return;
                      try {
                        await updateProject.mutateAsync({
                          id: selectedProjectId,
                          data: { scriptText: generatedScript, step: 'SCRIPT' },
                        });
                        queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(selectedProjectId) });
                        setActiveStepIndex(3);
                      } catch (err) {
                        console.error('Failed to save script:', err);
                      }
                    }}
                    disabled={!generatedScript?.trim() || updateProject.isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-black text-white hover:bg-neutral-800 font-semibold text-sm h-12 transition-all disabled:opacity-40 shadow-sm"
                  >
                    {updateProject.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving Script...
                      </>
                    ) : (
                      <>
                        Continue to Voice
                        <ArrowLeft className="h-4 w-4 rotate-180" />
                      </>
                    )}
                  </button>
                </Card>
              </motion.div>
            )}

            {/* STEP 3: VOICE */}
            {activeStepIndex === 3 && (
              <motion.div
                key="step-voice"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="rounded-[32px] border border-gray-100 shadow-sm bg-white overflow-hidden p-8 space-y-6">
                  <div>
                    <h2 className="font-extrabold text-xl text-black">Voice Generation</h2>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
                      Premium neural engine active
                    </p>
                  </div>

                  {/* Script Preview Foldout */}
                  <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setIsScriptPreviewOpen(!isScriptPreviewOpen)}
                      className="w-full flex justify-between items-center bg-gray-50 px-4 py-3 text-xs font-bold text-gray-700 hover:bg-gray-100/60 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        Script Preview: Scene 1-3
                      </span>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isScriptPreviewOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isScriptPreviewOpen && (
                      <div className="p-4 bg-white max-h-40 overflow-y-auto text-xs text-gray-500 font-sans leading-relaxed border-t border-gray-100 whitespace-pre-wrap">
                        {generatedScript}
                      </div>
                    )}
                  </div>

                  {/* Premium Voices Grid */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Premium Voices</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {PREMIUM_VOICES.map((v) => {
                        const isSelected = selectedVoiceId === v.id;
                        return (
                          <div
                            key={v.id}
                            onClick={() => setSelectedVoiceId(v.id)}
                            className={`rounded-2xl border p-4 transition-all duration-200 cursor-pointer flex items-center justify-between hover:shadow-xs ${
                              isSelected
                                ? 'border-black bg-white ring-1 ring-black shadow-xs'
                                : 'border-gray-100 bg-white hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <button className="h-8 w-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-black flex items-center justify-center shrink-0">
                                <Play className="h-3.5 w-3.5 fill-black stroke-none ml-0.5" />
                              </button>
                              <div className="min-w-0">
                                <h4 className="font-bold text-sm text-black truncate flex items-center gap-1.5">
                                  {v.name}
                                  {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                </h4>
                                <span className="text-[10px] text-gray-400 block truncate">{v.role}</span>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                              {v.badges.map(b => (
                                <span key={b} className="bg-gray-50 border border-gray-100 text-gray-400 rounded px-1.5 py-0.5 text-[8px] font-extrabold">
                                  {b}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sliders for customization */}
                  <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-5">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-extrabold text-gray-500 uppercase">Speed</label>
                        <span className="text-[10px] font-bold text-gray-400">{voiceSpeed}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={voiceSpeed}
                        onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                        className="w-full accent-black h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-extrabold text-gray-500 uppercase">Pitch</label>
                        <span className="text-[10px] font-bold text-gray-400">{voicePitch}%</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        step="5"
                        value={voicePitch}
                        onChange={(e) => setVoicePitch(parseInt(e.target.value))}
                        className="w-full accent-black h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Emotion Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase">Emotion</label>
                    <div className="relative">
                      <select
                        value={voiceEmotion}
                        onChange={(e) => setVoiceEmotion(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-3.5 pr-8 text-xs font-bold text-neutral-700 focus:outline-none focus:ring-1 focus:ring-black"
                      >
                        <option value="Professional & Calm">Professional & Calm</option>
                        <option value="Excited & Fast">Excited & Fast</option>
                        <option value="Serious & Clear">Serious & Clear</option>
                        <option value="Friendly & Conversational">Friendly & Conversational</option>
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {stepStatus.voice === 'error' && stepErrors.voice && (
                    <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-700">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{stepErrors.voice}</span>
                    </div>
                  )}

                  {generatedAudio && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-extrabold text-emerald-600 uppercase block">✓ Audio Created Successfully</span>
                      <AudioPlayer src={generatedAudio} />
                    </div>
                  )}

                  <div className="flex gap-4 pt-2">
                    <Button
                      onClick={handleGenerateVoice}
                      disabled={stepStatus.voice === 'loading'}
                      className="flex-1 rounded-2xl bg-black text-white hover:bg-neutral-800 font-semibold text-sm h-12 flex items-center justify-center gap-1.5"
                    >
                      {stepStatus.voice === 'loading' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-4 w-4" />
                          Generate Voice
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setActiveStepIndex(4)}
                      disabled={!generatedAudio && stepStatus.voice !== 'done'}
                      variant="outline"
                      className="flex-1 rounded-2xl border-gray-200 text-black hover:bg-gray-50 font-semibold text-sm h-12 flex items-center justify-center gap-1.5 disabled:opacity-40"
                    >
                      Continue to Video
                      <ArrowLeft className="h-4 w-4 rotate-180" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* STEP 4: VIDEO */}
            {activeStepIndex === 4 && (
              <motion.div
                key="step-video"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="rounded-[32px] border border-gray-100 shadow-sm bg-white overflow-hidden p-8 space-y-6">
                  <div>
                    <h2 className="font-extrabold text-xl text-black">Generate Avatar Video</h2>
                    <p className="text-xs text-gray-400 mt-1">HeyGen renders a talking-head avatar video using your voice script.</p>
                  </div>

                  {/* Rendering state fallback */}
                  {stepStatus.video === 'loading' ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 flex flex-col items-center gap-3 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-gray-100 shadow-sm">
                          <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-black">HeyGen is rendering your video…</p>
                          <p className="text-xs text-gray-400 mt-1">This typically takes 1–5 minutes. We&apos;ll update automatically.</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                          <Clock className="h-3.5 w-3.5" />
                          Checking every 10 seconds
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full rounded-2xl text-xs h-10"
                        onClick={pollVideoStatus}
                      >
                        Check Status Now
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Avatar Selection list */}
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Choose Avatar</label>
                        
                        {avatarsLoading ? (
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-4 gap-2 sm:gap-3">
                            {[1, 2, 3, 4].map(n => <div key={n} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />)}
                          </div>
                        ) : avatars.length > 0 ? (
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-4 gap-2 sm:gap-3 max-h-48 overflow-y-auto pr-1">
                            {avatars.map((a) => {
                              const isSelected = selectedAvatarId === a.avatar_id;
                              return (
                                <button
                                  key={a.avatar_id}
                                  onClick={() => setSelectedAvatarId(a.avatar_id)}
                                  className={`relative rounded-2xl overflow-hidden border-2 transition-all aspect-square shrink-0 ${
                                    isSelected
                                      ? 'border-black ring-1 ring-black'
                                      : 'border-gray-100 hover:border-gray-300'
                                  }`}
                                >
                                  {a.preview_image_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={a.preview_image_url}
                                      alt={a.avatar_name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                      <User2 className="h-5 w-5 text-gray-400" />
                                    </div>
                                  )}
                                  {isSelected && (
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                      <CheckCircle2 className="h-5 w-5 text-white" />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 bg-neutral-50 border border-neutral-100/50 rounded-xl p-3">
                            HeyGen key not connected yet — default avatar profile will be used.
                          </p>
                        )}
                      </div>

                      {/* Aspect Ratio choice */}
                      <div className="space-y-1.5 border-t border-gray-100 pt-4">
                        <label className="text-[10px] font-extrabold text-gray-500 uppercase">Aspect Ratio</label>
                        <div className="relative">
                          <select
                            value={videoRatio}
                            onChange={(e) => setVideoRatio(e.target.value as '16:9' | '9:16' | '1:1')}
                            className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-3.5 pr-8 text-xs font-bold text-neutral-700 focus:outline-none focus:ring-1 focus:ring-black"
                          >
                            <option value="16:9">Landscape (16:9)</option>
                            <option value="9:16">Portrait (9:16)</option>
                            <option value="1:1">Square (1:1)</option>
                          </select>
                          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      {stepErrors.video && (
                        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-700">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>{stepErrors.video}</span>
                        </div>
                      )}

                      <button
                        onClick={handleGenerateVideo}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-black text-white hover:bg-neutral-800 font-semibold text-sm h-12 transition-all"
                      >
                        <Video className="h-4 w-4" />
                        Generate Avatar Video with HeyGen
                      </button>
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

            {/* STEP 5: EXPORT */}
            {activeStepIndex === 5 && (
              <motion.div
                key="step-export"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="rounded-[32px] border border-gray-100 shadow-sm bg-white overflow-hidden p-8 space-y-6">
                  <div>
                    <h2 className="font-extrabold text-xl text-black">Video Ready</h2>
                    <p className="text-xs text-gray-400 mt-1">Your video is ready for download and production export.</p>
                  </div>

                  {generatedVideoUrl ? (
                    <div className="space-y-5">
                      <div className="rounded-2xl bg-black aspect-video flex items-center justify-center overflow-hidden shadow-sm border border-gray-100">
                        <video
                          src={generatedVideoUrl}
                          controls
                          className="w-full h-full object-contain rounded-2xl"
                        />
                      </div>
                      <div className="flex gap-4">
                        <a
                          href={generatedVideoUrl}
                          download
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-black text-white text-xs font-semibold h-11 hover:bg-neutral-800 transition-colors shadow-xs"
                        >
                          <Download className="h-4 w-4" /> Download Video
                        </a>
                        <a
                          href={generatedVideoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 text-black text-xs font-semibold h-11 hover:bg-gray-50 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" /> Open in New Tab
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-8 bg-neutral-50 rounded-2xl border border-neutral-100 border-dashed text-gray-400 text-xs">
                      No video URL found. Please check generation steps.
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Right Column: Sidebar Panels */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card 1: Project Details */}
          <Card className="rounded-[24px] border border-gray-100 shadow-xs bg-white p-6 space-y-4">
            <h3 className="font-bold text-sm text-neutral-800 font-sans border-b border-gray-50 pb-2">
              Project Details
            </h3>
            
            <div className="space-y-3.5 text-xs text-gray-500 font-medium">
              <div className="flex justify-between items-center">
                <span>Status</span>
                <span className="font-bold text-black bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5">
                  {project.status === 'COMPLETED' ? '✓ Completed' : project.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Created</span>
                <span className="text-black font-semibold">
                  {new Date(project.createdAt).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Last Edited</span>
                <span className="text-black font-semibold">
                  {new Date(project.updatedAt).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Est. Cost</span>
                <span className="text-black font-extrabold flex items-center gap-0.5">
                  © 45 Credits
                </span>
              </div>
            </div>
          </Card>

          {/* Card 2: Revision History / Idea History */}
          <Card className="rounded-[24px] border border-gray-100 shadow-xs bg-white p-6 space-y-4">
            <h3 className="font-bold text-sm text-neutral-800 font-sans border-b border-gray-50 pb-2 flex justify-between items-center">
              <span>{activeStepIndex === 1 ? 'Idea History' : 'Revision History'}</span>
              <Clock className="h-4 w-4 text-gray-400" />
            </h3>
            
            {activeStepIndex === 1 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center text-gray-400 space-y-3">
                <FileText className="h-10 w-10 text-gray-200 stroke-[1.5]" />
                <div>
                  <p className="font-bold text-xs text-neutral-600">No generation history yet</p>
                  <p className="text-[10px] text-gray-400 mt-1 leading-normal">Start writing and click generate to see versions here.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 relative pl-4 border-l border-gray-100">
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-black" />
                  <p className="text-xs font-bold text-black">Script Finalized</p>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Today, 10:45 AM</span>
                </div>
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-gray-300" />
                  <p className="text-xs font-bold text-neutral-600">Script Draft v2</p>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Yesterday, 4:20 PM</span>
                </div>
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-gray-300" />
                  <p className="text-xs font-bold text-neutral-600">Initial Concepts</p>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Oct 23, 11:00 AM</span>
                </div>
              </div>
            )}
          </Card>

          {/* Card 3: Live Visualizer (Only visible during step 3 - Voice) */}
          {activeStepIndex === 3 && (
            <Card className="rounded-[24px] border border-neutral-800 bg-[#0d0d0d] text-white p-6 shadow-xl relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                      Audio Engine Status
                    </span>
                    <h4 className="font-extrabold text-sm text-white font-sans">Voice Model Live</h4>
                    <span className="text-[10px] text-gray-400 font-sans block mt-0.5">
                      {selectedVoiceName} Neural v2.4
                    </span>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[8px] font-extrabold text-emerald-400 uppercase tracking-wide">
                    Live
                  </span>
                </div>

                {/* Animated wave visualizer bars */}
                <div className="h-16 flex items-end justify-center gap-1.5 pt-2">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-emerald-400 rounded-full animate-voice-bar"
                      style={{
                        height: `${20 + Math.random() * 80}%`,
                        animationDelay: `${i * 0.08}s`,
                        animationDuration: `${0.6 + Math.random() * 0.8}s`
                      }}
                    />
                  ))}
                </div>
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
