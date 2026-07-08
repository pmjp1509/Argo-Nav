import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Null when Supabase env vars are absent — the app still runs, auth/history
 *  features degrade gracefully (guarded by `isAuthEnabled`). */
export const supabase: SupabaseClient | null =
  url && anon ? createClient(url, anon) : null;

export const isAuthEnabled = Boolean(supabase);
