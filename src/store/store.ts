import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// UI-only store — server data (projects, history, API keys) is managed by TanStack Query.
// This store only holds ephemeral UI state that doesn't need to come from the DB.

interface AppState {
  // ─── UI State ──────────────────────────────────────────────────────────────
  activeTab: 'dashboard' | 'projects' | 'templates' | 'api-keys' | 'settings' | 'pipeline' | 'video-library' | 'publish';
  selectedProjectId: string | null;
  activeStepIndex: number | null;
  searchQuery: string;
  isCreateModalOpen: boolean;

  // Prefill data for template creation
  prefilledProjectData: {
    name: string;
    prompt: string;
    videoRatio: '16:9' | '9:16' | '1:1';
    voiceAccent: string;
  } | null;

  // ─── Auth UI State (NOT persisted — always start at landing page) ──────────
  authView: 'login' | 'signup' | null;

  // ─── Actions ───────────────────────────────────────────────────────────────
  setActiveTab: (tab: 'dashboard' | 'projects' | 'templates' | 'api-keys' | 'settings' | 'pipeline' | 'video-library' | 'publish') => void;
  setSelectedProjectId: (id: string | null) => void;
  setActiveStepIndex: (step: number | null) => void;
  openProject: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setIsCreateModalOpen: (open: boolean) => void;
  setAuthView: (view: 'login' | 'signup' | null) => void;
  setPrefilledProjectData: (data: { name: string; prompt: string; videoRatio: '16:9' | '9:16' | '1:1'; voiceAccent: string } | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      activeTab: 'dashboard',
      selectedProjectId: null,
      activeStepIndex: null,
      searchQuery: '',
      isCreateModalOpen: false,
      authView: null,
      prefilledProjectData: null,

      // Actions
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedProjectId: (id) => set({ selectedProjectId: id }),
      setActiveStepIndex: (step) => set({ activeStepIndex: step }),
      openProject: (id) => set({ activeTab: 'pipeline', selectedProjectId: id, activeStepIndex: null }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setIsCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
      setAuthView: (view) => set({ authView: view }),
      setPrefilledProjectData: (data) => set({ prefilledProjectData: data }),
    }),
    {
      name: 'scriptforge-ui-store',
      // Only persist non-auth UI state
      partialize: (state) => ({
        activeTab: state.activeTab === 'pipeline' ? 'dashboard' : state.activeTab,
        selectedProjectId: null, // never persist the open project — always start at dashboard
        searchQuery: state.searchQuery,
        isCreateModalOpen: state.isCreateModalOpen,
        prefilledProjectData: state.prefilledProjectData,
        // authView intentionally excluded — always start at landing page
      }),
    }
  )
);

