'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useProject, PROJECT_KEYS } from '@/hooks/useProjects';
import { useAppStore } from '@/store/store';
import { useQueryClient } from '@tanstack/react-query';
import {
  generateApi,
  voicesApi,
  avatarsApi,
  type ElevenLabsVoice,
  type HeyGenAvatar,
} from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, FileText, Volume2, Video, CheckCircle2,
  Loader2, Sparkles, Play, Pause, RefreshCw, Copy, Check,
  AlertCircle, ChevronDown, User2, Wand2, Download,
  ExternalLink, Clock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ─── Types ─────────────────────────────────────────────────────────────────────

type PipelineStep = 'script' | 'voice' | 'video';
type StepState = 'idle' | 'loading' | 'done' | 'error';

interface StepStatus {
  script: StepState;
  voice: StepState;
  video: StepState;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function stepLabel(step: PipelineStep) {
  return { script: 'Script', voice: 'Voice', video: 'Video' }[step];
}

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

// ─── Audio Player ─────────────────────────────────────────────────────────────

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { el.play(); setPlaying(true); }
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
        id="audio-player-toggle"
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

// ─── Step Panel Shell ─────────────────────────────────────────────────────────

function StepPanel({
  step,
  number,
  title,
  subtitle,
  state,
  isActive,
  isDone,
  children,
}: {
  step: PipelineStep;
  number: number;
  title: string;
  subtitle: string;
  state: StepState;
  isActive: boolean;
  isDone: boolean;
  children: React.ReactNode;
}) {
  const icons = { script: FileText, voice: Volume2, video: Video };
  const Icon = icons[step];

  return (
    <Card
      className={`rounded-3xl border transition-all duration-300 ${
        isActive
          ? 'border-black shadow-sm shadow-black/5'
          : isDone
          ? 'border-emerald-100 bg-emerald-50/20'
          : 'border-gray-100 bg-white opacity-60'
      }`}
    >
      <CardContent className="p-7 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                isDone
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                  : isActive
                  ? 'bg-black border-black text-white'
                  : 'bg-gray-50 border-gray-100 text-gray-400'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : state === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Step {number}
                </span>
                {isDone && (
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">
                    ✓ Done
                  </span>
                )}
              </div>
              <h3 className="font-bold text-sm text-black font-sans leading-none">{title}</h3>
            </div>
          </div>
          {state === 'error' && (
            <div className="flex items-center gap-1.5 text-red-500 text-xs font-semibold">
              <AlertCircle className="h-4 w-4" />
              Failed
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 font-sans leading-relaxed">{subtitle}</p>

        {(isActive || isDone) && children}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProjectPipeline() {
  const { selectedProjectId, setActiveTab } = useAppStore();
  const queryClient = useQueryClient();

  const { data: project, isLoading: isProjectLoading, refetch: refetchProject } = useProject(
    selectedProjectId ?? ''
  );

  // Step states
  const [stepStatus, setStepStatus] = useState<StepStatus>({
    script: 'idle',
    voice: 'idle',
    video: 'idle',
  });
  const [stepErrors, setStepErrors] = useState<Partial<Record<PipelineStep, string>>>({});

  // Generated content (in-memory for current session)
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  // UI state
  const [copiedScript, setCopiedScript] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('');
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [avatars, setAvatars] = useState<HeyGenAvatar[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [avatarsLoading, setAvatarsLoading] = useState(false);
  const [videoPollingActive, setVideoPollingActive] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hydrate state from existing project data
  useEffect(() => {
    if (!project) return;
    if (project.scriptText) {
      setGeneratedScript(project.scriptText);
      setStepStatus((s) => ({ ...s, script: 'done' }));
    }
    if (project.step === 'VOICE' || project.step === 'VIDEO') {
      setStepStatus((s) => ({ ...s, voice: 'done' }));
    }
    if (project.status === 'COMPLETED' && project.videoUrl && !project.videoUrl.startsWith('heygen:')) {
      setGeneratedVideoUrl(project.videoUrl);
      setStepStatus((s) => ({ ...s, video: 'done' }));
    }
    if (project.status === 'GENERATING' || project.videoUrl?.startsWith('heygen:')) {
      setStepStatus((s) => ({ ...s, video: 'loading' }));
      setVideoPollingActive(true);
    }
  }, [project]);

  // Load voices & avatars once project is loaded
  useEffect(() => {
    if (!project) return;
    (async () => {
      setVoicesLoading(true);
      try {
        const res = await voicesApi.list();
        setVoices(res.voices.slice(0, 20)); // cap at 20
      } catch { /* key not configured yet */ }
      finally { setVoicesLoading(false); }

      setAvatarsLoading(true);
      try {
        const res = await avatarsApi.list();
        setAvatars(res.avatars.slice(0, 12));
      } catch { /* key not configured yet */ }
      finally { setAvatarsLoading(false); }
    })();
  }, [project]);

  // Poll HeyGen video status
  const pollVideoStatus = useCallback(async () => {
    if (!selectedProjectId) return;
    try {
      const result = await generateApi.getVideoStatus(selectedProjectId);
      if (result.status === 'completed' && result.videoUrl) {
        setGeneratedVideoUrl(result.videoUrl);
        setStepStatus((s) => ({ ...s, video: 'done' }));
        setVideoPollingActive(false);
        queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(selectedProjectId) });
      } else if (result.status === 'failed') {
        setStepErrors((e) => ({ ...e, video: result.error ?? 'Video generation failed' }));
        setStepStatus((s) => ({ ...s, video: 'error' }));
        setVideoPollingActive(false);
      }
    } catch { /* keep polling */ }
  }, [selectedProjectId, queryClient]);

  useEffect(() => {
    if (videoPollingActive) {
      pollingRef.current = setInterval(pollVideoStatus, 10_000);
      pollVideoStatus(); // immediate first check
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [videoPollingActive, pollVideoStatus]);

  // ─── Action Handlers ──────────────────────────────────────────────────────────

  const handleGenerateScript = async () => {
    if (!selectedProjectId) return;
    setStepStatus((s) => ({ ...s, script: 'loading' }));
    setStepErrors((e) => ({ ...e, script: undefined }));
    try {
      const result = await generateApi.generateScript(selectedProjectId);
      setGeneratedScript(result.script);
      setStepStatus((s) => ({ ...s, script: 'done' }));
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
      const result = await generateApi.generateVoice(
        selectedProjectId,
        selectedVoiceId || undefined
      );
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

  // ─── Computed ─────────────────────────────────────────────────────────────────

  const activeStep: PipelineStep =
    stepStatus.script !== 'done' ? 'script'
    : stepStatus.voice !== 'done' ? 'voice'
    : 'video';

  if (isProjectLoading || !project) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-48 rounded bg-gray-100" />
        <div className="h-4 w-32 rounded bg-gray-100" />
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-40 rounded-3xl bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Top bar */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <button
            onClick={() => setActiveTab('projects')}
            id="pipeline-back-btn"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-black font-semibold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Projects
          </button>
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-black font-sans tracking-tight">
              {project.name}
            </h1>
            <div className="flex items-center gap-2">
              <StatusBadge status={project.status} />
              <span className="text-xs text-gray-400 font-sans">
                Updated {new Date(project.updatedAt).toLocaleDateString(undefined, {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Pipeline progress */}
        <div className="hidden md:flex items-center gap-2">
          {(['script', 'voice', 'video'] as PipelineStep[]).map((s, i) => {
            const done = stepStatus[s] === 'done';
            const active = s === activeStep;
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && (
                  <div className={`h-px w-8 transition-colors ${done ? 'bg-black' : 'bg-gray-200'}`} />
                )}
                <div
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all ${
                    done
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : active
                      ? 'bg-black text-white'
                      : 'bg-gray-50 text-gray-400 border border-gray-100'
                  }`}
                >
                  {done && <CheckCircle2 className="h-3 w-3" />}
                  {stepLabel(s)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Prompt context */}
      <div className="rounded-2xl bg-gray-50 border border-gray-100 px-5 py-4 flex items-start gap-3">
        <Sparkles className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
        <div>
          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Project Idea
          </span>
          <p className="text-sm text-black font-sans leading-relaxed">{project.prompt}</p>
        </div>
      </div>

      {/* ─── Step 1: Script ─────────────────────────────────────────── */}
      <StepPanel
        step="script"
        number={1}
        title="Generate Script"
        subtitle="NVIDIA NIM (Llama 3.1 70B) will craft a Hook → Intro → Body → CTA script from your idea."
        state={stepStatus.script}
        isActive={activeStep === 'script' || stepStatus.script === 'done'}
        isDone={stepStatus.script === 'done'}
      >
        <AnimatePresence mode="wait">
          {generatedScript ? (
            <motion.div
              key="script-result"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Generated Script
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyScript}
                    id="copy-script-btn"
                    className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-black transition-colors"
                  >
                    {copiedScript ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    {copiedScript ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={handleGenerateScript}
                    disabled={stepStatus.script === 'loading'}
                    id="regenerate-script-btn"
                    className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-black transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${stepStatus.script === 'loading' ? 'animate-spin' : ''}`} />
                    Regenerate
                  </button>
                </div>
              </div>
              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 max-h-72 overflow-y-auto">
                <pre className="text-xs text-gray-700 font-sans whitespace-pre-wrap leading-relaxed">
                  {generatedScript}
                </pre>
              </div>
            </motion.div>
          ) : (
            <motion.div key="script-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {stepErrors.script && (
                <div className="mb-3 flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-600 font-sans">{stepErrors.script}</p>
                </div>
              )}
              <button
                onClick={handleGenerateScript}
                disabled={stepStatus.script === 'loading'}
                id="generate-script-btn"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold py-3 transition-all duration-200"
              >
                {stepStatus.script === 'loading' ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating Script…</>
                ) : (
                  <><Wand2 className="h-4 w-4" /> Generate Script with NVIDIA NIM</>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </StepPanel>

      {/* ─── Step 2: Voice ─────────────────────────────────────────── */}
      <StepPanel
        step="voice"
        number={2}
        title="Generate Voice"
        subtitle="ElevenLabs converts your script to a studio-quality voiceover. Pick a voice below."
        state={stepStatus.voice}
        isActive={stepStatus.script === 'done'}
        isDone={stepStatus.voice === 'done'}
      >
        <AnimatePresence mode="wait">
          {generatedAudio ? (
            <motion.div
              key="audio-result"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <AudioPlayer src={generatedAudio} />
              <button
                onClick={handleGenerateVoice}
                disabled={stepStatus.voice === 'loading'}
                id="regenerate-voice-btn"
                className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-black transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${stepStatus.voice === 'loading' ? 'animate-spin' : ''}`} />
                Regenerate with different voice
              </button>
            </motion.div>
          ) : (
            <motion.div key="voice-controls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Voice picker */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  Choose Voice
                </label>
                {voicesLoading ? (
                  <div className="h-9 rounded-xl bg-gray-100 animate-pulse" />
                ) : voices.length > 0 ? (
                  <div className="relative">
                    <select
                      id="voice-select"
                      value={selectedVoiceId}
                      onChange={(e) => setSelectedVoiceId(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-3 pr-8 text-sm font-sans text-black focus:outline-none focus:ring-2 focus:ring-black/10"
                    >
                      <option value="">— Default (Rachel) —</option>
                      {voices.map((v) => (
                        <option key={v.voice_id} value={v.voice_id}>
                          {v.name}
                          {v.labels?.gender ? ` · ${v.labels.gender}` : ''}
                          {v.category && v.category !== 'premade' ? ` · ${v.category}` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    ElevenLabs key not connected yet — default voice (Rachel) will be used.
                  </p>
                )}
              </div>

              {stepErrors.voice && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-600 font-sans">{stepErrors.voice}</p>
                </div>
              )}

              <button
                onClick={handleGenerateVoice}
                disabled={stepStatus.script !== 'done' || stepStatus.voice === 'loading'}
                id="generate-voice-btn"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black text-white hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold py-3 transition-all duration-200"
              >
                {stepStatus.voice === 'loading' ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating Voice…</>
                ) : (
                  <><Volume2 className="h-4 w-4" /> Generate Voice with ElevenLabs</>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </StepPanel>

      {/* ─── Step 3: Video ─────────────────────────────────────────── */}
      <StepPanel
        step="video"
        number={3}
        title="Generate Avatar Video"
        subtitle="HeyGen renders a talking-head avatar video using your script and voice. This takes 1–5 minutes."
        state={stepStatus.video}
        isActive={stepStatus.voice === 'done'}
        isDone={stepStatus.video === 'done'}
      >
        <AnimatePresence mode="wait">
          {generatedVideoUrl ? (
            <motion.div
              key="video-result"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="rounded-2xl bg-black aspect-video flex items-center justify-center overflow-hidden">
                <video
                  src={generatedVideoUrl}
                  controls
                  className="w-full h-full object-contain rounded-2xl"
                />
              </div>
              <div className="flex gap-3">
                <a
                  href={generatedVideoUrl}
                  download
                  id="download-video-btn"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-black text-white text-xs font-semibold py-2.5 hover:bg-neutral-800 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Download Video
                </a>
                <a
                  href={generatedVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="open-video-btn"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 text-black text-xs font-semibold py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open in New Tab
                </a>
              </div>
            </motion.div>
          ) : stepStatus.video === 'loading' ? (
            <motion.div
              key="video-processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
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
                className="w-full rounded-2xl text-xs"
                onClick={pollVideoStatus}
                id="check-video-status-btn"
              >
                Check Status Now
              </Button>
            </motion.div>
          ) : (
            <motion.div key="video-controls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Avatar picker */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  Choose Avatar
                </label>
                {avatarsLoading ? (
                  <div className="grid grid-cols-4 gap-2">
                    {[1,2,3,4].map(n => <div key={n} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
                  </div>
                ) : avatars.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto pr-1">
                    {avatars.map((a) => (
                      <button
                        key={a.avatar_id}
                        id={`avatar-${a.avatar_id}`}
                        onClick={() => setSelectedAvatarId(a.avatar_id)}
                        className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-square ${
                          selectedAvatarId === a.avatar_id
                            ? 'border-black'
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
                        {selectedAvatarId === a.avatar_id && (
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    HeyGen key not connected — default avatar will be used.
                  </p>
                )}
              </div>

              {stepErrors.video && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-600 font-sans">{stepErrors.video}</p>
                </div>
              )}

              <button
                onClick={handleGenerateVideo}
                disabled={stepStatus.voice !== 'done' || (stepStatus.video as string) === 'loading'}
                id="generate-video-btn"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black text-white hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold py-3 transition-all duration-200"
              >
                {(stepStatus.video as string) === 'loading' ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Submitting to HeyGen…</>
                ) : (
                  <><Video className="h-4 w-4" /> Generate Avatar Video with HeyGen</>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </StepPanel>
    </div>
  );
}
