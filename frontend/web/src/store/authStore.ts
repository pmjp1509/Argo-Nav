import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

import { isAuthEnabled, supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  ready: boolean;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  ready: false,

  init: async () => {
    if (!supabase) {
      set({ ready: true });
      return;
    }
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, user: data.session?.user ?? null, ready: true });
    supabase.auth.onAuthStateChange((_e, s) => set({ session: s, user: s?.user ?? null }));
  },

  signIn: async (email, password) => {
    if (!supabase) throw new Error('Authentication is not configured.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signUp: async (email, password, fullName) => {
    if (!supabase) throw new Error('Authentication is not configured.');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: fullName ? { data: { full_name: fullName } } : undefined,
    });
    if (error) throw error;
  },

  signInWithGoogle: async () => {
    if (!supabase) throw new Error('Authentication is not configured.');
    const redirectTo =
      (import.meta.env.VITE_FRONTEND_ORIGIN as string | undefined)?.trim() ||
      (import.meta.env.VITE_APP_URL as string | undefined)?.trim() ||
      window.location.origin;

    // Redirects to Google, then back to the app root; supabase-js parses the
    // returned session automatically (detectSessionInUrl) and persists it.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) throw error;
  },

  signOut: async () => {
    await supabase?.auth.signOut();
    set({ user: null, session: null });
  },

  resetPassword: async (email) => {
    if (!supabase) throw new Error('Authentication is not configured.');
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },
}));

export { isAuthEnabled };
