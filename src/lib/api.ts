// Typed API fetch helpers for all ScriptForge AI endpoints

export type ProjectStatus = 'DRAFT' | 'SCRIPTING' | 'VOICING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
export type ProjectStep = 'IDEA' | 'SCRIPT' | 'VOICE' | 'VIDEO';
export type VideoRatio = 'RATIO_16_9' | 'RATIO_9_16' | 'RATIO_1_1';

export interface Project {
  id: string;
  name: string;
  prompt: string;
  status: ProjectStatus;
  step: ProjectStep;
  scriptText?: string | null;
  voiceAccent?: string | null;
  videoRatio?: VideoRatio | null;
  videoUrl?: string | null;
  duration?: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface GenerationHistoryEntry {
  id: string;
  type: 'SCRIPT' | 'VOICE' | 'VIDEO';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  project?: { id: string; name: string } | null;
}

export interface ApiKeyListing {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsed?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projectsApi = {
  list: () => apiFetch<{ projects: Project[] }>('/api/projects'),

  get: (id: string) => apiFetch<{ project: Project }>(`/api/projects/${id}`),

  create: (data: { name: string; prompt: string; videoRatio?: VideoRatio }) =>
    apiFetch<{ project: Project }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>) =>
    apiFetch<{ project: Project }>(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/projects/${id}`, { method: 'DELETE' }),
};

// ─── Generation History ────────────────────────────────────────────────────────

export const historyApi = {
  list: (params?: { limit?: number; projectId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.projectId) qs.set('projectId', params.projectId);
    return apiFetch<{ history: GenerationHistoryEntry[] }>(`/api/generation-history?${qs}`);
  },

  log: (data: { type: 'SCRIPT' | 'VOICE' | 'VIDEO'; status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'; projectId?: string; metadata?: Record<string, unknown> }) =>
    apiFetch<{ entry: GenerationHistoryEntry }>('/api/generation-history', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ─── API Keys ─────────────────────────────────────────────────────────────────

export const apiKeysApi = {
  list: () => apiFetch<{ keys: ApiKeyListing[] }>('/api/api-keys'),

  create: (data: { name: string; scopes?: string[]; expiresAt?: string }) =>
    apiFetch<{ apiKey: ApiKeyListing; rawKey: string }>('/api/api-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  revoke: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/api-keys/${id}`, { method: 'DELETE' }),
};

// ─── Provider API Keys ────────────────────────────────────────────────────────

export interface ProviderKeyDetails {
  connected: boolean;
  prefix: string;
  lastFour: string;
  updatedAt: string | null;
}

export const providerKeysApi = {
  list: () => apiFetch<{ keys: Record<string, ProviderKeyDetails> }>('/api/provider-keys'),

  save: (data: { provider: string; key?: string }) =>
    apiFetch<{ success: boolean; connected: boolean; provider: string; prefix?: string; lastFour?: string }>('/api/provider-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  test: (data: { provider: string; key?: string }) =>
    apiFetch<{ success: boolean; message: string }>('/api/provider-keys/test', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ─── User Settings ────────────────────────────────────────────────────────────

export interface UserSettings {
  username: string;
  bio: string;
  defaultLanguage: string;
  defaultDuration: string;
  defaultTone: string;
  theme: 'System' | 'Light' | 'Dark';
}

export interface UserSettingsResponse {
  fullName: string;
  email: string;
  avatarUrl?: string;
  settings: UserSettings;
  stats: {
    memberSince: string;
    projectsCreated: number;
    connectedProviders: number;
  };
}

export const settingsApi = {
  get: () => apiFetch<UserSettingsResponse>('/api/user/settings'),

  save: (data: {
    fullName: string;
    username: string;
    bio: string;
    defaultLanguage: string;
    defaultDuration: string;
    defaultTone: string;
    theme: 'System' | 'Light' | 'Dark';
    avatarUrl?: string;
  }) =>
    apiFetch<{ success: boolean; fullName: string; avatarUrl?: string; settings: UserSettings }>('/api/user/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ─── AI Generation Pipeline ────────────────────────────────────────────────────

export interface GenerateScriptResult {
  script: string;
  scriptId: string;
}

export interface GenerateVoiceResult {
  audioUrl: string; // base64 data URL
  voiceId: string;
  duration: string;
}

export interface GenerateVideoResult {
  videoId: string;
  status: 'processing';
  message: string;
}

export interface VideoStatusResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
  videoId?: string;
}

export const generateApi = {
  /** Step 1: Generate script from project prompt using NVIDIA NIM */
  generateScript: (projectId: string) =>
    apiFetch<GenerateScriptResult>('/api/generate/script', {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    }),

  /** Step 2: Generate voice audio from project script using ElevenLabs */
  generateVoice: (projectId: string, voiceId?: string) =>
    apiFetch<GenerateVoiceResult>('/api/generate/voice', {
      method: 'POST',
      body: JSON.stringify({ projectId, voiceId }),
    }),

  /** Step 3: Submit HeyGen avatar video job (returns immediately with videoId) */
  generateVideo: (data: { projectId: string; avatarId?: string; heygenVoiceId?: string }) =>
    apiFetch<GenerateVideoResult>('/api/generate/video', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Step 3b: Poll HeyGen for video completion — call every 10s until status is 'completed' or 'failed' */
  getVideoStatus: (projectId: string) =>
    apiFetch<VideoStatusResult>(`/api/generate/video/status?projectId=${projectId}`),
};

// ─── Voices (ElevenLabs) ──────────────────────────────────────────────────────

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  preview_url: string | null;
  labels: Record<string, string>;
}

export const voicesApi = {
  /** List all available ElevenLabs voices for the authenticated user's API key */
  list: () => apiFetch<{ voices: ElevenLabsVoice[] }>('/api/voices'),
};

// ─── Avatars (HeyGen) ─────────────────────────────────────────────────────────

export interface HeyGenAvatar {
  avatar_id: string;
  avatar_name: string;
  gender: string;
  preview_image_url: string;
  preview_video_url: string | null;
}

export const avatarsApi = {
  /** List all available HeyGen avatars for the authenticated user's API key */
  list: () => apiFetch<{ avatars: HeyGenAvatar[] }>('/api/avatars'),
  /** Fetch details/verify a specific HeyGen avatar ID */
  get: (id: string) => apiFetch<{ avatar: HeyGenAvatar }>(`/api/avatars?id=${encodeURIComponent(id)}`),
};
