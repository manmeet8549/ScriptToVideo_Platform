'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useProject, useUpdateProject, PROJECT_KEYS } from '@/hooks/useProjects';
import { useAppStore } from '@/store/store';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
  generateApi,
  avatarsApi,
  voicesApi,
  type HeyGenAvatar,
  type ElevenLabsVoice,
} from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  ArrowLeft, FileText, Volume2, Video, CheckCircle2,
  Loader2, Sparkles, Play, Pause, RefreshCw, Copy, Check,
  Link2, AlertCircle, ChevronDown, User2, Download,
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
  language: 'english' | 'hindi' | 'hinglish';
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
        language: parsed.language || 'english',
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
    language: 'english',
  };
}

function serializeProjectPrompt(concept: string, audience: string, tone: string, duration: string, language: 'english' | 'hindi' | 'hinglish'): string {
  return JSON.stringify({ concept, audience, tone, duration, language });
}

// ─── Voice configurations matching mockup ─────────────────────────────────────

const PREMIUM_VOICES = [
  {
    id: 'pNInz6obpgDQGcFmaJgB', // Adam (Default Deep Male)
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
    id: 'EXAVITQu4vr4xnSDxMaL', // Bella (Default Warm Female)
    name: 'Elena',
    role: 'Friendly Female · Conversational',
    badges: ['WARM', 'ENGAGING'],
    avatarLetter: 'E'
  },
  {
    id: 'AZnzlk1XvdvUeBnXmlld', // Domi (Clear Female)
    name: 'Sofia',
    role: 'Professional Female · News Anchor',
    badges: ['CLEAR', 'FORMAL'],
    avatarLetter: 'S'
  },
  {
    id: '2EiwWnXFnvU5JabPnv8n', // Clyde (Energetic Male)
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

const NARRATION_PRESETS: Record<string, { stability: number; similarity_boost: number; style: number; use_speaker_boost: boolean }> = {
  'Narration': { stability: 0.75, similarity_boost: 0.85, style: 0.0, use_speaker_boost: true },
  'Podcast': { stability: 0.60, similarity_boost: 0.75, style: 0.10, use_speaker_boost: true },
  'Commercial': { stability: 0.45, similarity_boost: 0.75, style: 0.25, use_speaker_boost: true },
  'Storytelling': { stability: 0.55, similarity_boost: 0.80, style: 0.15, use_speaker_boost: true },
  'News Reader': { stability: 0.80, similarity_boost: 0.85, style: 0.0, use_speaker_boost: true },
  'Educational': { stability: 0.70, similarity_boost: 0.80, style: 0.05, use_speaker_boost: true },
};

// ─── Main Pipeline Component ──────────────────────────────────────────────────

export default function ProjectPipeline() {
  const { data: session } = useSession();
  const [userCredits, setUserCredits] = useState<{
    scriptCredits: number;
    voiceCredits: number;
    videoCredits: number;
    publishCredits: number;
    storageLimitGB: number;
    storageUsedGB: number;
  } | null>(null);

  const fetchUserCredits = useCallback(async () => {
    try {
      const res = await fetch('/api/user/credits');
      if (res.ok) {
        const json = await res.json();
        setUserCredits(json.wallet);
      }
    } catch (err) {
      console.error('Failed to fetch user credits:', err);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.role === 'USER') {
      fetchUserCredits();
    }
  }, [session, fetchUserCredits]);

  const selectedProjectId = useAppStore((state) => state.selectedProjectId);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const queryClient = useQueryClient();
  const updateProject = useUpdateProject();

  const { data: project, isLoading: isProjectLoading } = useProject(
    selectedProjectId ?? ''
  );

  // Active step navigation (1 to 5) from Zustand store
  const activeStepIndex = useAppStore((state) => state.activeStepIndex);
  const setActiveStepIndex = useAppStore((state) => state.setActiveStepIndex);

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
  const [isDownloading, setIsDownloading] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    setVideoError(false);
  }, [generatedVideoUrl]);

  // Form fields for Step 1 (Idea)
  const [ideaConcept, setIdeaConcept] = useState('');
  const [ideaAudience, setIdeaAudience] = useState('');
  const [ideaTone, setIdeaTone] = useState('');
  const [ideaDuration, setIdeaDuration] = useState('');
  const [ideaLanguage, setIdeaLanguage] = useState<'english' | 'hindi' | 'hinglish'>('english');

  // Voice configurations (Step 3)
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(PREMIUM_VOICES[0].id);
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);
  const [voicePitch, setVoicePitch] = useState<number>(0);
  const [voiceEmotion, setVoiceEmotion] = useState<string>('Professional & Calm');
  const [isScriptPreviewOpen, setIsScriptPreviewOpen] = useState(false);
  
  const [voiceStability, setVoiceStability] = useState<number>(0.75);
  const [voiceSimilarityBoost, setVoiceSimilarityBoost] = useState<number>(0.85);
  const [voiceStyleExaggeration, setVoiceStyleExaggeration] = useState<number>(0.0);
  const [voiceSpeakerBoost, setVoiceSpeakerBoost] = useState<boolean>(true);
  const [selectedPreset, setSelectedPreset] = useState<string>('Narration');
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName);
    const preset = NARRATION_PRESETS[presetName];
    if (preset) {
      setVoiceStability(preset.stability);
      setVoiceSimilarityBoost(preset.similarity_boost);
      setVoiceStyleExaggeration(preset.style);
      setVoiceSpeakerBoost(preset.use_speaker_boost);
    }
  };

  const handleGeneratePreview = async () => {
    setIsPreviewLoading(true);
    setPreviewError(null);
    setVoicePreviewUrl(null);
    try {
      const res = await fetch('/api/voices/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceId: selectedVoiceId,
          text: 'Hi, this is a live preview of my customized voice settings. How does it sound?',
          settings: {
            stability: voiceStability,
            similarity_boost: voiceSimilarityBoost,
            style: voiceStyleExaggeration,
            use_speaker_boost: voiceSpeakerBoost,
          }
        })
      });
      const data = await res.json();
      if (res.ok) {
        setVoicePreviewUrl(data.audioUrl);
      } else {
        setPreviewError(data.error || 'Failed to generate voice preview.');
      }
    } catch (err) {
      setPreviewError('An error occurred during voice preview generation.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Custom ElevenLabs voices state
  const [elevenLabsVoices, setElevenLabsVoices] = useState<ElevenLabsVoice[]>([]);
  const [isElevenVoicesLoading, setIsElevenVoicesLoading] = useState(false);
  const [elevenVoicesError, setElevenVoicesError] = useState<string | null>(null);
  const [voiceSearchQuery, setVoiceSearchQuery] = useState('');
  const [voiceTab, setVoiceTab] = useState<'presets' | 'all'>('presets');
  const [playingPreviewUrl, setPlayingPreviewUrl] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch ElevenLabs voices (wrapped in useCallback to be call-able on demand)
  const fetchVoices = useCallback(async () => {
    setIsElevenVoicesLoading(true);
    setElevenVoicesError(null);
    try {
      const res = await voicesApi.list();
      setElevenLabsVoices(res.voices || []);
    } catch (err) {
      console.error('Failed to load ElevenLabs voices:', err);
      setElevenVoicesError('ElevenLabs API key not configured or failed to load voices. Please verify your ElevenLabs API Key in Settings.');
    } finally {
      setIsElevenVoicesLoading(false);
    }
  }, []);

  // Fetch ElevenLabs voices if activeStepIndex is 3
  useEffect(() => {
    if (activeStepIndex === 3) {
      fetchVoices();
    }
  }, [activeStepIndex, fetchVoices]);


  const handleTogglePreview = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (playingPreviewUrl === url) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPlayingPreviewUrl(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.play().catch(err => console.error('Audio play failed:', err));
      setPlayingPreviewUrl(url);
      audio.onended = () => {
        setPlayingPreviewUrl(null);
      };
    }
  };

  const getVoicePreviewUrl = (voiceId: string) => {
    const matched = elevenLabsVoices.find(v => v.voice_id === voiceId);
    return matched?.preview_url || null;
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
    };
  }, []);

  const filteredVoices = elevenLabsVoices.filter(v =>
    v.name.toLowerCase().includes(voiceSearchQuery.toLowerCase())
  );

  // Avatar selections (Step 4)
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('');
  const [videoRatio, setVideoRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [avatars, setAvatars] = useState<HeyGenAvatar[]>([]);
  const [avatarsLoading, setAvatarsLoading] = useState(false);
  const [videoPollingActive, setVideoPollingActive] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Custom Avatar ID selection (Alternative method)
  const [customAvatarId, setCustomAvatarId] = useState<string>('');
  const [customAvatar, setCustomAvatar] = useState<HeyGenAvatar | null>(null);
  const [customAvatarError, setCustomAvatarError] = useState<string | null>(null);
  const [customAvatarLoading, setCustomAvatarLoading] = useState(false);

  // UI status helpers
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedVideoLink, setCopiedVideoLink] = useState(false);

  // Track last synced project ID to prevent resetting local selection state on query invalidations
  const lastSyncedProjectIdRef = useRef<string | null>(null);

  // Sync DB details to frontend state
  useEffect(() => {
    if (!project) return;

    // Parse prompt values
    const parsed = parseProjectPrompt(project.prompt);
    setIdeaConcept((curr) => curr || parsed.concept);
    setIdeaAudience((curr) => curr || parsed.audience || 'Tech Enthusiasts, General Public');
    setIdeaTone((curr) => curr || parsed.tone || 'Educational, Optimistic');
    setIdeaDuration((curr) => curr || parsed.duration || '~3:45 minutes');
    setIdeaLanguage((curr) => curr || parsed.language || 'english');

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

    // Restore generated voice settings and file if present on first load
    const isNewProjectLoad = lastSyncedProjectIdRef.current !== project.id;
    if (isNewProjectLoad) {
      lastSyncedProjectIdRef.current = project.id;
      
      const latestVoice = project.voices?.[0];
      if (latestVoice) {
        setGeneratedAudio(latestVoice.audioUrl || null);
        if (latestVoice.accent) {
          setSelectedVoiceId(latestVoice.accent);
        }
        if (typeof latestVoice.speed === 'number') {
          setVoiceSpeed(latestVoice.speed);
        }
        if (typeof latestVoice.pitch === 'number') {
          setVoicePitch(latestVoice.pitch);
        }
        if (typeof latestVoice.emotion === 'string') {
          setVoiceEmotion(latestVoice.emotion);
        }
      } else {
        setGeneratedAudio(null);
      }
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

  // Validate and fetch custom avatar details
  useEffect(() => {
    const trimmedId = customAvatarId.trim();
    if (!trimmedId) {
      setCustomAvatar(null);
      setCustomAvatarError(null);
      setCustomAvatarLoading(false);
      return;
    }

    // Format validation (letters, numbers, hyphens, underscores)
    const isValidFormat = /^[a-zA-Z0-9_-]+$/.test(trimmedId);
    if (!isValidFormat) {
      setCustomAvatar(null);
      setCustomAvatarError('Invalid ID format. Only letters, numbers, hyphens, and underscores are allowed.');
      setCustomAvatarLoading(false);
      return;
    }

    if (trimmedId.length < 4) {
      setCustomAvatar(null);
      setCustomAvatarError('Avatar ID is too short.');
      setCustomAvatarLoading(false);
      return;
    }

    setCustomAvatarError(null);
    setCustomAvatarLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await avatarsApi.get(trimmedId);
        if (res.avatar) {
          setCustomAvatar(res.avatar);
          setCustomAvatarError(null);
        } else {
          setCustomAvatar(null);
          setCustomAvatarError('Avatar ID not found or invalid.');
        }
      } catch (err) {
        setCustomAvatar(null);
        const errMsg = err instanceof Error ? err.message : 'Failed to verify Avatar ID.';
        setCustomAvatarError(errMsg);
      } finally {
        setCustomAvatarLoading(false);
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(timer);
  }, [customAvatarId]);

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
        fetchUserCredits();
      } else if (result.status === 'failed') {
        setStepErrors((e) => ({ ...e, video: result.error ?? 'Video generation failed' }));
        setStepStatus((s) => ({ ...s, video: 'error' }));
        setVideoPollingActive(false);
      }
    } catch { /* fail safe polling */ }
  }, [selectedProjectId, queryClient, setActiveStepIndex, fetchUserCredits]);

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
      const serialized = serializeProjectPrompt(ideaConcept, ideaAudience, ideaTone, ideaDuration, ideaLanguage);
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
      const serialized = serializeProjectPrompt(ideaConcept, ideaAudience, ideaTone, ideaDuration, ideaLanguage);
      await updateProject.mutateAsync({
        id: selectedProjectId,
        data: { prompt: serialized },
      });

      // 2. Call NIM generation proxy
      const result = await generateApi.generateScript(selectedProjectId);
      setGeneratedScript(result.script);
      setStepStatus((s) => ({ ...s, script: 'done' }));
      fetchUserCredits();
      
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
      const result = await generateApi.generateVoice({
        projectId: selectedProjectId,
        voiceId: selectedVoiceId,
        speed: voiceSpeed,
        pitch: voicePitch,
        emotion: voiceEmotion,
        settings: {
          stability: voiceStability,
          similarity_boost: voiceSimilarityBoost,
          style: voiceStyleExaggeration,
          use_speaker_boost: voiceSpeakerBoost,
        }
      });
      setGeneratedAudio(result.audioUrl);
      setStepStatus((s) => ({ ...s, voice: 'done' }));
      fetchUserCredits();
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(selectedProjectId) });
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Voice generation failed';
      setStepErrors((e) => ({ ...e, voice: msg }));
      setStepStatus((s) => ({ ...s, voice: 'error' }));

      // Automatic recovery: If the voice ID is invalid or not accessible
      const isVoiceError = 
        msg.includes('not found') || 
        msg.includes('not accessible') || 
        msg.includes('no longer available') ||
        msg.includes('voice_id');

      if (isVoiceError) {
        console.warn(`[VOICE_GEN] Voice ID ${selectedVoiceId} was reported invalid or inaccessible. Initiating automatic recovery.`);
        
        // 1. Reset state to first premium preset (Marcus/Adam - which is valid)
        const fallbackVoiceId = PREMIUM_VOICES[0].id;
        setSelectedVoiceId(fallbackVoiceId);

        // 2. Refresh the voice list from ElevenLabs in the background to ensure it is fully synchronized
        fetchVoices().catch((fetchErr) => {
          console.error('Failed to automatically refresh voices list:', fetchErr);
        });

        // 3. Clear/sync the invalid voice ID from the project state in the database
        try {
          await updateProject.mutateAsync({
            id: selectedProjectId,
            data: { voiceAccent: fallbackVoiceId },
          });
          queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(selectedProjectId) });
        } catch (dbErr) {
          console.error('Failed to sync cleared voiceAccent in DB:', dbErr);
        }
      }
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

      const avatarToUse = (customAvatarId.trim() && customAvatar)
        ? customAvatar.avatar_id
        : selectedAvatarId;

      await generateApi.generateVideo({
        projectId: selectedProjectId,
        avatarId: avatarToUse || undefined,
      });

      fetchUserCredits();
      setVideoPollingActive(true);
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(selectedProjectId) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Video generation failed';
      setStepErrors((e) => ({ ...e, video: msg }));
      setStepStatus((s) => ({ ...s, video: 'error' }));
    }
  };

  const handleDownloadVideo = async () => {
    if (!generatedVideoUrl) return;
    try {
      setIsDownloading(true);
      const res = await fetch(generatedVideoUrl);
      if (!res.ok) throw new Error('Network response was not ok');
      const blob = await res.blob();
      const localUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = localUrl;
      const name = project?.name ? project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'avatar-video';
      a.download = `${name}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(localUrl);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download video. The asset may be missing, expired or blocked by cross-origin security.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyScript = () => {
    if (!generatedScript) return;
    navigator.clipboard.writeText(generatedScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleCopyVideoLink = () => {
    if (!generatedVideoUrl) return;
    navigator.clipboard.writeText(generatedVideoUrl);
    setCopiedVideoLink(true);
    setTimeout(() => setCopiedVideoLink(false), 2000);
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
          {generatedVideoUrl ? (
            <a
              href={generatedVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-semibold h-10 px-5 inline-flex items-center justify-center transition-colors shadow-sm"
            >
              Export
            </a>
          ) : (
            <Button
              disabled
              className="rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-semibold h-10 px-5"
            >
              Export
            </Button>
          )}
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

                        {/* Language Style */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-extrabold text-gray-500 uppercase">Language Style</label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['english', 'hindi', 'hinglish'] as const).map((lang) => {
                              const labels = {
                                english: 'English',
                                hindi: 'Hindi (हिंदी)',
                                hinglish: 'Hinglish'
                              };
                              const isSelected = ideaLanguage === lang;
                              return (
                                <button
                                  key={lang}
                                  type="button"
                                  onClick={() => setIdeaLanguage(lang)}
                                  className={`h-11 rounded-xl border text-xs font-bold transition-all ${
                                    isSelected
                                      ? 'border-black bg-black text-white shadow-xs'
                                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                  }`}
                                >
                                  {labels[lang]}
                                </button>
                              );
                            })}
                          </div>
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
                      <h2 className="font-extrabold text-xl text-black font-sans">Review Script</h2>
                      <p className="text-xs text-gray-400 mt-1 flex flex-wrap items-center gap-2 font-sans">
                        Read and tweak the generated AI script before voicing.
                        <span className="inline-flex items-center rounded-full bg-neutral-150/40 px-2 py-0.5 text-[9px] font-extrabold text-neutral-600 border border-neutral-200 capitalize">
                          {ideaLanguage}
                        </span>
                      </p>
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

                  {/* Voice Options Tab Selector */}
                  <div className="flex gap-4 border-b border-gray-100 pb-2">
                    <button
                      onClick={() => setVoiceTab('presets')}
                      className={`text-xs font-bold pb-2 px-1 border-b-2 transition-all ${
                        voiceTab === 'presets'
                          ? 'border-black text-black'
                          : 'border-transparent text-gray-400 hover:text-black'
                      }`}
                    >
                      Premium Presets
                    </button>
                    <button
                      onClick={() => setVoiceTab('all')}
                      className={`text-xs font-bold pb-2 px-1 border-b-2 transition-all flex items-center gap-1.5 ${
                        voiceTab === 'all'
                          ? 'border-black text-black'
                          : 'border-transparent text-gray-400 hover:text-black'
                      }`}
                    >
                      My ElevenLabs Voices
                      {elevenLabsVoices.length > 0 && (
                        <span className="bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                          {elevenLabsVoices.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {voiceTab === 'presets' ? (
                    /* Premium Voices Grid */
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {PREMIUM_VOICES.map((v) => {
                          const isSelected = selectedVoiceId === v.id;
                          const previewUrl = getVoicePreviewUrl(v.id);
                          const isPlaying = previewUrl && playingPreviewUrl === previewUrl;

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
                                {previewUrl ? (
                                  <button
                                    onClick={(e) => handleTogglePreview(previewUrl, e)}
                                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                      isPlaying ? 'bg-black text-white' : 'bg-neutral-100 hover:bg-neutral-200 text-black'
                                    }`}
                                  >
                                    {isPlaying ? (
                                      <Pause className="h-3.5 w-3.5 fill-current" />
                                    ) : (
                                      <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                                    )}
                                  </button>
                                ) : (
                                  <button className="h-8 w-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-black flex items-center justify-center shrink-0">
                                    <Play className="h-3.5 w-3.5 fill-black stroke-none ml-0.5" />
                                  </button>
                                )}
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
                  ) : (
                    /* My ElevenLabs Voices List */
                    <div className="space-y-4">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search ElevenLabs voices..."
                          value={voiceSearchQuery}
                          onChange={(e) => setVoiceSearchQuery(e.target.value)}
                          className="flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black font-sans"
                        />
                      </div>

                      {isElevenVoicesLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-3">
                          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                          <p className="text-xs text-gray-400">Loading ElevenLabs voices...</p>
                        </div>
                      ) : elevenVoicesError ? (
                        <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center space-y-3 bg-neutral-50/30">
                          <AlertCircle className="h-6 w-6 text-amber-500 mx-auto" />
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-black">Could not fetch voices</h4>
                            <p className="text-[11px] text-gray-400 max-w-sm mx-auto leading-relaxed">
                              {elevenVoicesError}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setActiveTab('api-keys');
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-black text-white hover:bg-neutral-800 text-xs font-semibold px-4 py-2 transition-colors"
                          >
                            Set API Key
                          </button>
                        </div>
                      ) : filteredVoices.length === 0 ? (
                        <div className="text-center py-12 text-xs text-gray-400 font-medium">
                          No voices found matching &quot;{voiceSearchQuery}&quot;
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[280px] overflow-y-auto pr-1">
                          {filteredVoices.map((v) => {
                            const isSelected = selectedVoiceId === v.voice_id;
                            const isPlaying = v.preview_url && playingPreviewUrl === v.preview_url;

                            return (
                              <div
                                key={v.voice_id}
                                onClick={() => setSelectedVoiceId(v.voice_id)}
                                className={`rounded-2xl border p-4 transition-all duration-200 cursor-pointer flex items-center justify-between hover:shadow-xs ${
                                  isSelected
                                    ? 'border-black bg-white ring-1 ring-black shadow-xs'
                                    : 'border-gray-100 bg-white hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {v.preview_url ? (
                                    <button
                                      onClick={(e) => handleTogglePreview(v.preview_url!, e)}
                                      className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                        isPlaying ? 'bg-black text-white' : 'bg-neutral-100 hover:bg-neutral-200 text-black'
                                      }`}
                                    >
                                      {isPlaying ? (
                                        <Pause className="h-3.5 w-3.5 fill-current" />
                                      ) : (
                                        <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                                      )}
                                    </button>
                                  ) : (
                                    <div className="h-8 w-8 rounded-full bg-neutral-50 flex items-center justify-center text-gray-300 shrink-0">
                                      <Play className="h-3.5 w-3.5 fill-current ml-0.5 opacity-30" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-sm text-black truncate flex items-center gap-1.5">
                                      {v.name}
                                      {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                    </h4>
                                    <span className="text-[10px] text-gray-400 block truncate capitalize">
                                      {v.category} Voice
                                    </span>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                                  {v.labels && Object.entries(v.labels).slice(0, 2).map(([key, val]) => (
                                    <span key={key} className="bg-gray-50 border border-gray-100 text-gray-400 rounded px-1.5 py-0.5 text-[8px] font-extrabold uppercase">
                                      {val}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Narration Preset Dropdown */}
                  <div className="space-y-1.5 border-t border-gray-100 pt-5">
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase">Narration Style Preset</label>
                    <div className="relative">
                      <select
                        value={selectedPreset}
                        onChange={(e) => handlePresetChange(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-3.5 pr-8 text-xs font-bold text-neutral-700 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
                      >
                        {Object.keys(NARRATION_PRESETS).map((preset) => (
                          <option key={preset} value={preset}>
                            {preset}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Sliders for customization */}
                  <div className="grid grid-cols-2 gap-4">
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

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-extrabold text-gray-500 uppercase">Stability</label>
                        <span className="text-[10px] font-bold text-gray-400">{Math.round(voiceStability * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={voiceStability}
                        onChange={(e) => setVoiceStability(parseFloat(e.target.value))}
                        className="w-full accent-black h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-extrabold text-gray-500 uppercase">Clarity / Similarity</label>
                        <span className="text-[10px] font-bold text-gray-400">{Math.round(voiceSimilarityBoost * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={voiceSimilarityBoost}
                        onChange={(e) => setVoiceSimilarityBoost(parseFloat(e.target.value))}
                        className="w-full accent-black h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-extrabold text-gray-500 uppercase">Style Exaggeration</label>
                        <span className="text-[10px] font-bold text-gray-400">{Math.round(voiceStyleExaggeration * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={voiceStyleExaggeration}
                        onChange={(e) => setVoiceStyleExaggeration(parseFloat(e.target.value))}
                        className="w-full accent-black h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5 flex flex-col justify-end">
                      <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={voiceSpeakerBoost}
                          onChange={(e) => setVoiceSpeakerBoost(e.target.checked)}
                          className="h-4 w-4 rounded-md border-gray-300 accent-black cursor-pointer"
                        />
                        Use Speaker Boost
                      </label>
                    </div>
                  </div>

                  {/* Emotion Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase">Emotion</label>
                    <div className="relative">
                      <select
                        value={voiceEmotion}
                        onChange={(e) => setVoiceEmotion(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-3.5 pr-8 text-xs font-bold text-neutral-700 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
                      >
                        <option value="Professional & Calm">Professional & Calm</option>
                        <option value="Excited & Fast">Excited & Fast</option>
                        <option value="Serious & Clear">Serious & Clear</option>
                        <option value="Friendly & Conversational">Friendly & Conversational</option>
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Voice Preview Block */}
                  <div className="p-4 bg-neutral-50/50 border border-neutral-100 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Voice Preview</span>
                      <button
                        type="button"
                        onClick={handleGeneratePreview}
                        disabled={isPreviewLoading}
                        className="text-xs font-bold text-black hover:underline disabled:opacity-40 cursor-pointer"
                      >
                        {isPreviewLoading ? 'Generating...' : voicePreviewUrl ? 'Regenerate Preview' : 'Generate Preview'}
                      </button>
                    </div>
                    {isPreviewLoading && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 font-bold py-1">
                        <Loader2 className="h-4.5 w-4.5 animate-spin text-black" />
                        <span>Rendering short sample...</span>
                      </div>
                    )}
                    {previewError && (
                      <div className="text-[11px] font-semibold text-red-600 bg-red-50/50 border border-red-100 rounded-lg p-2 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{previewError}</span>
                      </div>
                    )}
                    {voicePreviewUrl && !isPreviewLoading && (
                      <div className="space-y-1">
                        <span className="text-[9px] text-gray-400 font-bold">Listen to custom settings:</span>
                        <AudioPlayer src={voicePreviewUrl} />
                      </div>
                    )}
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
                          {generatedAudio ? 'Regenerate Voice' : 'Generate Voice'}
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
                      {/* Avatar ID (Optional) Input Field */}
                      <div className="space-y-1.5 pb-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">
                            Avatar ID (Optional)
                          </label>
                          {customAvatarLoading && (
                            <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                              <Loader2 className="h-3 w-3 animate-spin" /> Verifying...
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="Enter HeyGen Avatar ID"
                          value={customAvatarId}
                          onChange={(e) => setCustomAvatarId(e.target.value)}
                          className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black font-sans"
                        />
                        <p className="text-[10px] text-gray-400 leading-normal">
                          Have a custom HeyGen avatar? Enter its Avatar ID here. Leave blank to select an avatar from the gallery below.
                        </p>

                        {/* Display Custom Avatar Preview or Error */}
                        {customAvatarId.trim() !== '' && (
                          <div className="mt-2.5">
                            {customAvatarError ? (
                              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 p-2.5 text-[11px] text-red-700 animate-in fade-in slide-in-from-top-1 duration-200">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                <span>{customAvatarError}</span>
                              </div>
                            ) : customAvatar ? (
                              <div className="flex items-center gap-3 rounded-2xl border-2 border-black bg-neutral-50 p-2.5 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="relative h-12 w-12 rounded-xl overflow-hidden border border-gray-150 shrink-0 bg-white">
                                  {customAvatar.preview_image_url ? (
                                    <Image
                                      src={customAvatar.preview_image_url}
                                      alt={customAvatar.avatar_name}
                                      fill
                                      unoptimized
                                      className="object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                      <User2 className="h-4 w-4 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-extrabold text-black truncate">
                                    {customAvatar.avatar_name}
                                  </p>
                                  <p className="text-[9px] text-neutral-500 uppercase font-extrabold tracking-wider">
                                    Active Custom Avatar
                                  </p>
                                </div>
                                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-black shrink-0">
                                  <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>

                      {/* Avatar Selection list */}
                      <div className="space-y-2.5 border-t border-gray-100 pt-4">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">
                            Choose Avatar
                          </label>
                          {customAvatarId.trim() && customAvatar && (
                            <span className="text-[9px] bg-neutral-100 text-neutral-500 font-bold px-2 py-0.5 rounded-full animate-in fade-in duration-250">
                              Dimmed because Custom ID is active
                            </span>
                          )}
                        </div>
                        
                        {avatarsLoading ? (
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-4 gap-2 sm:gap-3">
                            {[1, 2, 3, 4].map(n => <div key={n} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />)}
                          </div>
                        ) : avatars.length > 0 ? (
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-4 gap-2 sm:gap-3 max-h-48 overflow-y-auto pr-1">
                            {avatars.map((a) => {
                              const isSelected = !customAvatarId.trim() && selectedAvatarId === a.avatar_id;
                              return (
                                <button
                                  key={a.avatar_id}
                                  onClick={() => {
                                    setSelectedAvatarId(a.avatar_id);
                                    setCustomAvatarId('');
                                  }}
                                  className={`relative rounded-2xl overflow-hidden border-2 transition-all aspect-square shrink-0 ${
                                    isSelected
                                      ? 'border-black ring-1 ring-black shadow-xs'
                                      : 'border-gray-100 hover:border-gray-300'
                                  } ${customAvatarId.trim() && customAvatar ? 'opacity-40 hover:opacity-75' : ''}`}
                                >
                                  {a.preview_image_url ? (
                                    <Image
                                      src={a.preview_image_url}
                                      alt={a.avatar_name}
                                      fill
                                      unoptimized
                                      className="object-cover"
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

                      {session?.user?.role === 'USER' && userCredits && (
                        <>
                          {userCredits.storageUsedGB >= userCredits.storageLimitGB ? (
                            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-700 animate-in fade-in duration-200">
                              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                              <span>Storage Limit Reached: You have consumed {userCredits.storageUsedGB.toFixed(2)} GB of your {userCredits.storageLimitGB} GB limit. Video generation blocked.</span>
                            </div>
                          ) : null}
                        </>
                      )}

                      {stepErrors.video && (
                        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-700 animate-in fade-in duration-200">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>{stepErrors.video}</span>
                        </div>
                      )}

                      <button
                        onClick={handleGenerateVideo}
                        disabled={
                          (customAvatarId.trim() !== '' && (customAvatarLoading || !customAvatar)) ||
                          (session?.user?.role === 'USER' && !!userCredits && (
                            userCredits.storageUsedGB >= userCredits.storageLimitGB
                          ))
                        }
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed font-semibold text-sm h-12 transition-all shadow-xs"
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
                      <div className={`rounded-2xl bg-black flex items-center justify-center overflow-hidden shadow-sm border border-gray-150 mx-auto w-full transition-all duration-300 ${
                        videoRatio === '9:16' 
                          ? 'aspect-[9/16] max-w-xs sm:max-w-sm' 
                          : videoRatio === '1:1' 
                            ? 'aspect-square max-w-md' 
                            : 'aspect-video'
                      }`}>
                        {videoError || !generatedVideoUrl ? (
                          <div className="relative z-20 flex flex-col items-center justify-center p-8 text-center space-y-4 max-w-md mx-auto">
                            <div className="h-12 w-12 rounded-2xl bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400">
                              <AlertCircle className="h-6 w-6" />
                            </div>
                            <div className="space-y-1.5">
                              <h4 className="text-sm font-bold text-white">Video Asset Offline</h4>
                              <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                                This video asset is missing or has expired in R2 storage. Please regenerate the video to restore access.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <video
                            src={generatedVideoUrl}
                            controls
                            onError={() => setVideoError(true)}
                            className="w-full h-full object-contain rounded-2xl"
                          />
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={handleDownloadVideo}
                          disabled={isDownloading}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-black text-white text-xs font-semibold h-11 hover:bg-neutral-800 transition-colors shadow-sm disabled:opacity-50"
                        >
                          {isDownloading ? (
                            <Loader2 className="h-4.5 w-4.5 animate-spin text-white" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          {isDownloading ? 'Saving...' : 'Download Video'}
                        </button>
                        
                        <button
                          onClick={handleCopyVideoLink}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-250 text-neutral-600 text-xs font-semibold h-11 hover:bg-gray-50 hover:text-black transition-colors"
                        >
                          {copiedVideoLink ? (
                            <>
                              <Check className="h-4 w-4 text-emerald-600" />
                              <span className="text-emerald-600">Link Copied</span>
                            </>
                          ) : (
                            <>
                              <Link2 className="h-4 w-4" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>

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
                <span>Language</span>
                <span className="font-bold text-black bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 capitalize">
                  {ideaLanguage}
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
