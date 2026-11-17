-- Farmer knowledge sharing with explicit permission before public publication.
create table if not exists public.indigenous_knowledge_posts (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 4 and 160),
  category text not null check (category in ('Seeds and indigenous crops','Seasonal planting','Soil and water','Pest and disease management','Food preservation','Traditional foods and uses','Weather and local indicators','Other')),
  crop_or_subject text,
  locality text,
  content text not null check (char_length(trim(content)) between 30 and 12000),
  language text not null default 'Tshivenda',
  attribution text,
  sharing_scope text not null check (sharing_scope in ('public','community')),
  consent_to_share boolean not null default false,
  status text not null default 'published' check (status in ('published','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint indigenous_knowledge_explicit_consent check (consent_to_share = true)
);
create index if not exists indigenous_knowledge_posts_created_idx on public.indigenous_knowledge_posts (created_at desc);
create index if not exists indigenous_knowledge_posts_category_idx on public.indigenous_knowledge_posts (category, created_at desc);
alter table public.indigenous_knowledge_posts enable row level security;
drop policy if exists "Public can read public indigenous knowledge" on public.indigenous_knowledge_posts;
create policy "Public can read public indigenous knowledge" on public.indigenous_knowledge_posts for select to anon, authenticated using (status = 'published' and sharing_scope = 'public');
drop policy if exists "Farmers can read own indigenous knowledge" on public.indigenous_knowledge_posts;
create policy "Farmers can read own indigenous knowledge" on public.indigenous_knowledge_posts for select to authenticated using (farmer_id = auth.uid());
drop policy if exists "Farmers can create consented knowledge posts" on public.indigenous_knowledge_posts;
create policy "Farmers can create consented knowledge posts" on public.indigenous_knowledge_posts for insert to authenticated with check (farmer_id = auth.uid() and public.current_role_name() = 'farmer' and consent_to_share = true);
drop policy if exists "Farmers can update own knowledge posts" on public.indigenous_knowledge_posts;
create policy "Farmers can update own knowledge posts" on public.indigenous_knowledge_posts for update to authenticated using (farmer_id = auth.uid()) with check (farmer_id = auth.uid() and consent_to_share = true);
grant select (id, title, category, crop_or_subject, locality, content, language, attribution, sharing_scope, created_at) on public.indigenous_knowledge_posts to anon, authenticated;
grant insert (farmer_id, title, category, crop_or_subject, locality, content, language, attribution, sharing_scope, consent_to_share) on public.indigenous_knowledge_posts to authenticated;
grant update (title, category, crop_or_subject, locality, content, language, attribution, sharing_scope, consent_to_share, status, updated_at) on public.indigenous_knowledge_posts to authenticated;
