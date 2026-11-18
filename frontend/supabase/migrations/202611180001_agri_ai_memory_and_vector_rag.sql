-- AGRIC AI: consent-based chat persistence and optional pgvector retrieval.
-- Additive only. Apply to a development database after review; do not apply to production implicitly.

create table if not exists public.agri_ai_memory_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  consented_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint agri_ai_memory_consent_consistency check (
    (enabled = false) or (enabled = true and consented_at is not null)
  )
);

create table if not exists public.agri_ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  language text not null default 'en'
    check (language in ('en','ve','ts','nso','zu','xh','af','tn','st','ss','nr')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agri_ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.agri_ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists agri_ai_messages_user_created_idx
  on public.agri_ai_messages(user_id, created_at desc);
create index if not exists agri_ai_messages_conversation_created_idx
  on public.agri_ai_messages(conversation_id, created_at asc);

alter table public.agri_ai_memory_preferences enable row level security;
alter table public.agri_ai_conversations enable row level security;
alter table public.agri_ai_messages enable row level security;

drop policy if exists "Users manage their AGRIC AI memory preference" on public.agri_ai_memory_preferences;
create policy "Users manage their AGRIC AI memory preference"
  on public.agri_ai_memory_preferences for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their AGRIC AI conversation" on public.agri_ai_conversations;
create policy "Users manage their AGRIC AI conversation"
  on public.agri_ai_conversations for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their AGRIC AI messages" on public.agri_ai_messages;
create policy "Users manage their AGRIC AI messages"
  on public.agri_ai_messages for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.agri_ai_conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.agri_ai_memory_preferences to authenticated;
grant select, insert, update, delete on public.agri_ai_conversations to authenticated;
grant select, insert, update, delete on public.agri_ai_messages to authenticated;
revoke all on public.agri_ai_memory_preferences from anon;
revoke all on public.agri_ai_conversations from anon;
revoke all on public.agri_ai_messages from anon;

-- pgvector is available on the current Supabase platform but is not currently installed
-- in the live project. This is deliberately staged as a migration, not applied automatically.
create schema if not exists extensions;
create extension if not exists vector with schema extensions;

alter table public.agri_knowledge_chunks
  add column if not exists embedding extensions.vector(1024);

create index if not exists agri_knowledge_chunks_embedding_hnsw_idx
  on public.agri_knowledge_chunks
  using hnsw (embedding extensions.vector_cosine_ops)
  where embedding is not null;

create or replace function public.match_agri_knowledge_chunks(
  query_embedding extensions.vector(1024),
  match_count integer default 5,
  locality_filter text default null,
  crop_filter text default null
)
returns table (
  chunk_id uuid,
  source_id uuid,
  title text,
  publisher text,
  source_url text,
  published_on date,
  language text,
  heading text,
  content text,
  locality_tags text[],
  crop_tags text[],
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    c.id,
    s.id,
    s.title,
    s.publisher,
    s.source_url,
    s.published_on,
    s.language,
    c.heading,
    c.content,
    c.locality_tags,
    c.crop_tags,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.agri_knowledge_chunks c
  join public.agri_knowledge_sources s on s.id = c.source_id
  where s.status = 'approved'
    and c.embedding is not null
    and (locality_filter is null or c.locality_tags = '{}' or exists (
      select 1 from unnest(c.locality_tags) tag
      where lower(tag) = lower(locality_filter)
    ))
    and (crop_filter is null or c.crop_tags = '{}' or exists (
      select 1 from unnest(c.crop_tags) tag
      where lower(tag) = lower(crop_filter)
    ))
  order by c.embedding <=> query_embedding
  limit greatest(1, least(coalesce(match_count, 5), 20));
$$;

revoke all on function public.match_agri_knowledge_chunks(extensions.vector, integer, text, text) from public, anon;
grant execute on function public.match_agri_knowledge_chunks(extensions.vector, integer, text, text) to authenticated;

comment on table public.agri_ai_memory_preferences is
  'Explicit opt-in for AGRIC AI chat persistence; disabling consent deletes stored chat messages and conversation.';
comment on table public.agri_ai_messages is
  'User-owned AGRIC AI conversation messages. Stored only while explicit memory consent is enabled.';
comment on column public.agri_knowledge_chunks.embedding is
  'Optional 1024-dimensional embedding. Populate only with an explicitly configured, compatible embedding provider.';
