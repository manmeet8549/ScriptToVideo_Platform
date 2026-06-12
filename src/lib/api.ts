// Typed API fetch helpers for all ScriptForge AI endpoints

export type ProjectStatus = 'DRAFT' | 'SCRIPTING' | 'VOICING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
export type ProjectStep = 'IDEA' | 'SCRIPT' | 'VOICE' | 'VIDEO';
export type VideoRatio = 'RATIO_16_9' | 'RATIO_9_16' | 'RATIO_1_1';

export interface ProjectVoice {
  id: string;
  accent: string;
  audioUrl?: string | null;
  duration?: string | null;
  speed?: number | null;
  pitch?: number | null;
  emotion?: string | null;
  createdAt: string;
}

export interface Video {
  id: string;
  userId: string;
  projectId: string;
  title: string;
  status: string;
  r2Key: string;
  videoUrl: string;
  fileSize?: number | null;
  duration?: number | null;
  thumbnailUrl?: string | null;
  thumbnailKey?: string | null;
  thumbnailGeneratedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  project?: {
    name: string;
  };
}

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
  voices?: ProjectVoice[];
  videos?: Video[];
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
    const rawError = body.error ?? body.message;
    const errorText = typeof rawError === 'object' && rawError !== null
      ? (rawError.message || JSON.stringify(rawError))
      : (rawError ?? `Request failed: ${res.status}`);
    throw new Error(errorText);
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
  generateVoice: (data: { projectId: string; voiceId?: string; speed?: number; pitch?: number; emotion?: string }) =>
    apiFetch<GenerateVoiceResult>('/api/generate/voice', {
      method: 'POST',
      body: JSON.stringify(data),
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

// ─── Editors Connection System (Phase 3) ──────────────────────────────────────

export interface EditorProfileDetails {
  id: string;
  userId: string;
  editorKey: string;
  displayName: string | null;
  bio: string | null;
  skills: string[];
  availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  createdAt: string;
  user: {
    name: string | null;
    email: string;
  };
}

export interface ConnectionDetails {
  id: string;
  userId: string;
  editorId: string;
  editorKey: string;
  status: 'ACTIVE' | 'DISCONNECTED' | 'BLOCKED';
  createdAt: string;
  connectedAt: string;
  disconnectedAt: string | null;
  editor?: {
    name: string | null;
    email: string;
    editorProfile: {
      displayName: string | null;
      bio: string | null;
      skills: string[];
      availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
    } | null;
  };
  user?: {
    name: string | null;
    email: string;
  };
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export const editorsApi = {
  connect: (editorKey: string) =>
    apiFetch<{ success: boolean; message?: string; connection: ConnectionDetails }>('/api/editors/connect', {
      method: 'POST',
      body: JSON.stringify({ editorKey }),
    }),

  disconnect: (data: { connectionId?: string; editorId?: string }) =>
    apiFetch<{ success: boolean }>('/api/editors/disconnect', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  myEditors: () =>
    apiFetch<{ connections: ConnectionDetails[] }>('/api/editors/my-editors'),

  myUsers: () =>
    apiFetch<{ connections: ConnectionDetails[] }>('/api/editors/my-users'),

  updateProfile: (data: { displayName?: string; bio?: string; skills?: string[]; availability?: 'AVAILABLE' | 'BUSY' | 'OFFLINE' }) =>
    apiFetch<{ success: boolean; profile: EditorProfileDetails }>('/api/editors/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getProfile: () =>
    apiFetch<{ profile: EditorProfileDetails }>('/api/editors/profile'),

  getNotifications: () =>
    apiFetch<{ notifications: NotificationItem[] }>('/api/notifications'),

  markNotificationsRead: () =>
    apiFetch<{ success: boolean }>('/api/notifications/read', {
      method: 'POST',
    }),
};

export const adminConnectionsApi = {
  list: () =>
    apiFetch<{ connections: ConnectionDetails[] }>('/api/admin/connections'),

  updateStatus: (id: string, action: 'DISCONNECT' | 'BLOCK' | 'RESTORE') =>
    apiFetch<{ success: boolean }>(`/api/admin/connections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    }),
};

// ─── Video Assignment & Editing Workflow (Phase 4) ───────────────────────────

export interface EditedVideoDetails {
  id: string;
  assignmentId: string;
  originalVideoId: string;
  editedVideoUrl: string;
  editedVideoKey: string;
  thumbnailUrl: string | null;
  thumbnailKey: string | null;
  version: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface VideoAssignmentDetails {
  id: string;
  videoId: string;
  userId: string;
  editorId: string;
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'REVIEW' | 'REVISION_REQUESTED' | 'COMPLETED' | 'APPROVED' | 'REJECTED';
  progress: number;
  estimatedHours: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  video: {
    id: string;
    title: string;
    videoUrl: string;
    thumbnailUrl: string | null;
  };
  user: {
    name: string | null;
    email: string;
  };
  editor: {
    name: string | null;
    email: string;
  };
  editedVideos: EditedVideoDetails[];
}

export interface UploadUrlDetails {
  videoUrl: string;
  thumbnailUrl?: string;
  videoKey: string;
  thumbnailKey?: string;
  version: number;
}

export const assignmentsApi = {
  create: (data: { videoId: string; editorId: string; notes?: string }) =>
    apiFetch<{ success: boolean; assignment: VideoAssignmentDetails }>('/api/assignments/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  accept: (assignmentId: string) =>
    apiFetch<{ success: boolean }>('/api/assignments/accept', {
      method: 'POST',
      body: JSON.stringify({ assignmentId }),
    }),

  reject: (assignmentId: string) =>
    apiFetch<{ success: boolean }>('/api/assignments/reject', {
      method: 'POST',
      body: JSON.stringify({ assignmentId }),
    }),

  updateProgress: (assignmentId: string, progress: number, estimatedHours?: number) =>
    apiFetch<{ success: boolean }>('/api/assignments/progress', {
      method: 'POST',
      body: JSON.stringify({ assignmentId, progress, estimatedHours }),
    }),

  getUploadUrl: (assignmentId: string, contentType: string, hasThumbnail: boolean) => {
    const qs = new URLSearchParams({ assignmentId, contentType, hasThumbnail: String(hasThumbnail) });
    return apiFetch<UploadUrlDetails>(`/api/assignments/upload?${qs}`);
  },

  completeUpload: (data: { assignmentId: string; videoKey: string; thumbnailKey?: string; version: number }) =>
    apiFetch<{ success: boolean; assignment: VideoAssignmentDetails }>('/api/assignments/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  requestRevision: (assignmentId: string, notes: string) =>
    apiFetch<{ success: boolean }>('/api/assignments/revision', {
      method: 'POST',
      body: JSON.stringify({ assignmentId, notes }),
    }),

  approve: (assignmentId: string) =>
    apiFetch<{ success: boolean }>('/api/assignments/approve', {
      method: 'POST',
      body: JSON.stringify({ assignmentId }),
    }),

  getUserAssignments: () =>
    apiFetch<{ assignments: VideoAssignmentDetails[] }>('/api/assignments/user'),

  getEditorAssignments: () =>
    apiFetch<{ assignments: VideoAssignmentDetails[] }>('/api/assignments/editor'),
};

export const adminAssignmentsApi = {
  list: () =>
    apiFetch<{ assignments: VideoAssignmentDetails[] }>('/api/admin/assignments'),

  manage: (assignmentId: string, action: 'CANCEL' | 'REASSIGN', editorId?: string) =>
    apiFetch<{ success: boolean }>(`/api/admin/assignments/${assignmentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action, editorId }),
    }),
};
