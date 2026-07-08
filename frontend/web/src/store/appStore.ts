/** Global app state — the backbone that keeps map, details, charts, and AI in sync. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AgentResponse, FloatFilters } from '@/lib/api/types';

type Theme = 'dark' | 'light';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  response?: AgentResponse;
  ts: number;
  loading?: boolean;
  error?: string;
  errorKind?: 'credits' | 'network' | 'unavailable' | 'unknown';
}

export interface MapViewport {
  center: [number, number];
  zoom: number;
}

interface AppState {
  // theme
  theme: Theme;
  toggleTheme: () => void;

  // collapsible sidebar (persisted)
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // global AI drawer + conversation (preserved across navigation)
  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  toggleChat: () => void;
  messages: ChatMessage[];
  addMessage: (m: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  clearChat: () => void;

  // map-centric selection/highlight state
  selectedFloatId?: string;
  selectFloat: (id?: string) => void;
  selectedProfile?: number;
  setSelectedProfile: (cycle?: number) => void;
  highlightedFloatIds: string[];
  fitNonce: number; // bumped when the map should fit to the highlighted set
  setHighlighted: (ids: string[], fit?: boolean) => void;

  latestAgentResponse?: AgentResponse;
  setLatest: (r?: AgentResponse) => void;

  currentFilters: FloatFilters;
  setFilters: (f: FloatFilters) => void;

  mapViewport?: MapViewport;
  setMapViewport: (v: MapViewport) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      chatOpen: false,
      setChatOpen: (v) => set({ chatOpen: v }),
      toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
      messages: [],
      addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
      updateMessage: (id, patch) =>
        set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      clearChat: () => set({ messages: [] }),

      selectedFloatId: undefined,
      selectFloat: (id) => set({ selectedFloatId: id }),
      selectedProfile: undefined,
      setSelectedProfile: (cycle) => set({ selectedProfile: cycle }),

      highlightedFloatIds: [],
      fitNonce: 0,
      setHighlighted: (ids, fit = true) =>
        set((s) => ({ highlightedFloatIds: ids, fitNonce: fit ? s.fitNonce + 1 : s.fitNonce })),

      latestAgentResponse: undefined,
      setLatest: (r) => set({ latestAgentResponse: r }),

      currentFilters: {},
      setFilters: (f) => set({ currentFilters: f }),

      mapViewport: undefined,
      setMapViewport: (v) => set({ mapViewport: v }),
    }),
    { name: 'argo-ui', partialize: (s) => ({ theme: s.theme, sidebarCollapsed: s.sidebarCollapsed }) },
  ),
);
