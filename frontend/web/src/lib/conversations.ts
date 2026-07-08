/**
 * Conversation history in Postgres (Supabase table `public.conversations`, RLS).
 * We store the LLM-generated response (incl. the generated SQL) so reuse is
 * instant and consumes NO AI credits — the stored answer is displayed directly,
 * and the stored SQL can be re-run for fresh data via /sql/run.
 */
import { supabase } from '@/lib/supabase';
import type { AgentResponse } from '@/lib/api/types';

export type ConversationKind = 'sql' | 'knowledge' | 'map' | 'profile' | 'analytics';

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  response: AgentResponse;
  generated_sql: string | null;
  confidence: number | null;
  kind: ConversationKind;
  model: string | null;
  created_at: string;
}

export function deriveKind(r: AgentResponse): ConversationKind {
  const tools = r.tools_used ?? [];
  if (tools.includes('profile_query')) return 'profile';
  if (tools.includes('knowledge_search')) return 'knowledge';
  if (r.float_ids?.length) return 'map';
  if (tools.includes('sql_query') || r.sql) return 'sql';
  return 'analytics';
}

function title(prompt: string): string {
  const t = prompt.trim().replace(/\s+/g, ' ');
  return t.length > 80 ? `${t.slice(0, 80)}…` : t;
}

/** Persist a completed exchange for the signed-in user (no-op if not signed in). */
export async function saveConversation(userId: string, prompt: string, response: AgentResponse) {
  if (!supabase) return;
  await supabase.from('conversations').insert({
    user_id: userId,
    title: title(prompt),
    prompt,
    response,
    generated_sql: response.sql ?? null,
    confidence: response.confidence ?? null,
    kind: deriveKind(response),
    model: response.tools_used?.length ? 'agent' : null,
  });
}

export async function listConversations(search?: string): Promise<Conversation[]> {
  if (!supabase) return [];
  let q = supabase.from('conversations').select('*').order('created_at', { ascending: false }).limit(200);
  if (search?.trim()) q = q.ilike('prompt', `%${search.trim()}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Conversation[];
}

export async function deleteConversation(id: string) {
  if (!supabase) return;
  const { error } = await supabase.from('conversations').delete().eq('id', id);
  if (error) throw error;
}

export async function clearConversations() {
  if (!supabase) return;
  const { error } = await supabase.from('conversations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
}
