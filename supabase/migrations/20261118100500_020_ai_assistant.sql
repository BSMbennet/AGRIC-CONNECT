-- AgricNorthX AI assistant: private conversation history and usage metering.
-- Everything is owner-only. Users can delete their own conversations (messages cascade).
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text check (title is null or char_length(title) <= 120),
  language text not null default 'en' check (language in ('en','ve','ts','nso')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_conversations_user_idx on public.ai_conversations (user_id, updated_at desc);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) between 1 and 8000),
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_conv_idx on public.ai_messages (conversation_id, created_at);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  model text,
  prompt_tokens integer check (prompt_tokens is null or prompt_tokens >= 0),
  completion_tokens integer check (completion_tokens is null or completion_tokens >= 0),
  outcome text not null check (outcome in ('ok','fallback','error')),
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_time_idx on public.ai_usage (user_id, created_at desc);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_usage enable row level security;

drop policy if exists "own conversations read" on public.ai_conversations;
create policy "own conversations read" on public.ai_conversations for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "own conversations create" on public.ai_conversations;
create policy "own conversations create" on public.ai_conversations for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "own conversations update" on public.ai_conversations;
create policy "own conversations update" on public.ai_conversations for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "own conversations delete" on public.ai_conversations;
create policy "own conversations delete" on public.ai_conversations for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "own messages read" on public.ai_messages;
create policy "own messages read" on public.ai_messages for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "own messages create" on public.ai_messages;
create policy "own messages create" on public.ai_messages for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = (select auth.uid())));

drop policy if exists "own usage read" on public.ai_usage;
create policy "own usage read" on public.ai_usage for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "own usage create" on public.ai_usage;
create policy "own usage create" on public.ai_usage for insert to authenticated with check (user_id = (select auth.uid()));

revoke all on public.ai_conversations, public.ai_messages, public.ai_usage from anon, public;
grant select, insert, update, delete on public.ai_conversations to authenticated;
grant select, insert on public.ai_messages to authenticated;
grant select, insert on public.ai_usage to authenticated;
