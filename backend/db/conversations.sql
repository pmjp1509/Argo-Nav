-- Conversation history (per-user, RLS-protected). Run once in the Supabase SQL Editor.
-- The frontend reads/writes this table directly via the authenticated Supabase client;
-- RLS ensures a user only ever sees their own rows. Designed to extend later
-- (folders, starred, sharing, multi-turn) without a redesign.

create table if not exists public.conversations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text,
  prompt        text not null,
  response      jsonb,                 -- full AgentResponse (answer, sources, warnings, chart, confidence)
  generated_sql text,                  -- the LLM-generated SQL; re-run directly on reuse (no LLM)
  confidence    real,
  kind          text,                  -- 'sql' | 'knowledge' | 'map' | 'profile' | 'analytics' (history icon)
  model         text,
  -- Reserved for future features (folders, starred, sharing, multi-turn):
  parent_id     uuid references public.conversations(id) on delete set null,
  folder        text,
  is_starred    boolean not null default false,
  is_shared     boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists idx_conversations_user on public.conversations (user_id, created_at desc);
create index if not exists idx_conversations_prompt_trgm on public.conversations using gin (prompt gin_trgm_ops);

alter table public.conversations enable row level security;

drop policy if exists "conversations_own" on public.conversations;
create policy "conversations_own" on public.conversations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
