-- 028: trusted agricultural knowledge retrieval and assistant request controls
create table if not exists public.agri_knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  publisher text not null,
  source_url text not null unique,
  source_type text not null default 'guideline' check (source_type in ('guideline','research','extension','government')),
  published_on date,
  locality_tags text[] not null default '{}',
  crop_tags text[] not null default '{}',
  language text not null default 'en',
  status text not null default 'pending' check (status in ('pending','approved','archived')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.agri_knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.agri_knowledge_sources(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  heading text,
  content text not null check (char_length(content) between 40 and 12000),
  locality_tags text[] not null default '{}',
  crop_tags text[] not null default '{}',
  search_document tsvector generated always as (
    to_tsvector('simple', coalesce(heading,'') || ' ' || content)
  ) stored,
  created_at timestamptz not null default now(),
  unique(source_id, chunk_index)
);

create index if not exists agri_knowledge_chunks_search_idx
  on public.agri_knowledge_chunks using gin(search_document);
create index if not exists agri_knowledge_chunks_locality_idx
  on public.agri_knowledge_chunks using gin(locality_tags);
create index if not exists agri_knowledge_chunks_crop_idx
  on public.agri_knowledge_chunks using gin(crop_tags);

alter table public.agri_knowledge_sources enable row level security;
alter table public.agri_knowledge_chunks enable row level security;
revoke all on public.agri_knowledge_sources, public.agri_knowledge_chunks from anon, authenticated;
grant select on public.agri_knowledge_sources, public.agri_knowledge_chunks to authenticated;

drop policy if exists "Approved agricultural sources are readable" on public.agri_knowledge_sources;
create policy "Approved agricultural sources are readable"
  on public.agri_knowledge_sources for select to authenticated
  using (status = 'approved');

drop policy if exists "Approved agricultural chunks are readable" on public.agri_knowledge_chunks;
create policy "Approved agricultural chunks are readable"
  on public.agri_knowledge_chunks for select to authenticated
  using (exists (
    select 1 from public.agri_knowledge_sources s
    where s.id = source_id and s.status = 'approved'
  ));

create or replace function public.search_agri_knowledge(
  query_text text,
  locality_filter text default null,
  crop_filter text default null,
  result_limit integer default 5
)
returns table (
  chunk_id uuid,
  source_id uuid,
  title text,
  publisher text,
  source_url text,
  published_on date,
  heading text,
  content text,
  locality_tags text[],
  crop_tags text[],
  rank real
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    s.id,
    s.title,
    s.publisher,
    s.source_url,
    s.published_on,
    c.heading,
    c.content,
    c.locality_tags,
    c.crop_tags,
    ts_rank_cd(c.search_document, websearch_to_tsquery('simple', coalesce(query_text,'')))::real
  from public.agri_knowledge_chunks c
  join public.agri_knowledge_sources s on s.id = c.source_id
  where s.status = 'approved'
    and char_length(trim(coalesce(query_text,''))) >= 2
    and c.search_document @@ websearch_to_tsquery('simple', query_text)
    and (
      locality_filter is null
      or c.locality_tags && array[locality_filter, 'Vhembe', 'Limpopo']::text[]
      or s.locality_tags && array[locality_filter, 'Vhembe', 'Limpopo']::text[]
    )
    and (
      crop_filter is null
      or c.crop_tags && array[crop_filter]::text[]
      or s.crop_tags && array[crop_filter]::text[]
    )
  order by rank desc, s.published_on desc nulls last
  limit greatest(1, least(coalesce(result_limit,5), 8));
$$;

revoke all on function public.search_agri_knowledge(text,text,text,integer) from public, anon;
grant execute on function public.search_agri_knowledge(text,text,text,integer) to authenticated;

create table if not exists private.assistant_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  request_count integer not null default 0,
  primary key(user_id, window_start)
);
revoke all on private.assistant_rate_limits from public, anon, authenticated;

create or replace function private.consume_assistant_rate_limit()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_window timestamptz := date_trunc('minute', now());
  v_count integer;
begin
  if v_user is null then
    return false;
  end if;

  insert into private.assistant_rate_limits(user_id, window_start, request_count)
  values (v_user, v_window, 1)
  on conflict (user_id, window_start)
  do update set request_count = private.assistant_rate_limits.request_count + 1
  returning request_count into v_count;

  return v_count <= 12;
end;
$$;
revoke all on function private.consume_assistant_rate_limit() from public, anon;
grant execute on function private.consume_assistant_rate_limit() to authenticated;

-- Initial reviewed sources. These are concise, source-attributed notes, not substitutes
-- for the full publications. Additional document ingestion requires review before approval.
insert into public.agri_knowledge_sources
  (title,publisher,source_url,source_type,locality_tags,crop_tags,status,reviewed_at)
values
  ('Tomato Production in Limpopo Province','Limpopo Department of Agriculture and Rural Development',
   'https://www.ldard.gov.za/index.php/tomato-production-in-limpopo-province',
   'government',array['Limpopo','Vhembe'],array['tomato'], 'approved',now()),
  ('Crop Production Guide','Limpopo Department of Agriculture and Rural Development',
   'https://www.ldard.gov.za/index.php/crop-production-guide',
   'government',array['Limpopo','Vhembe'],array['cabbage','carrot','onion','tomato','spinach','beetroot'], 'approved',now()),
  ('Production guideline for African leafy vegetable cultivation in Capricorn and Vhembe districts',
   'Water Research Commission',
   'https://www.wrc.org.za/mdocs-posts/production-guideline-for-african-leafy-vegetable-cultivation-in-the-capricorn-and-vhembe-districts-in-limpopo/',
   'research',array['Limpopo','Vhembe','Capricorn'],array['African leafy vegetables','indigenous vegetables'], 'approved',now()),
  ('ARC Information Hub','Agricultural Research Council',
   'https://www.arc.agric.za/Pages/ARC-Information-Hub.aspx',
   'extension',array['South Africa','Limpopo'],array['maize','sorghum','cowpea','dry bean','groundnut','soybean','sunflower'], 'approved',now())
on conflict (source_url) do update set
  title=excluded.title,publisher=excluded.publisher,locality_tags=excluded.locality_tags,
  crop_tags=excluded.crop_tags,status='approved',reviewed_at=now();

insert into public.agri_knowledge_chunks(source_id,chunk_index,heading,content,locality_tags,crop_tags)
select s.id,0,'Soil, temperature and field preparation',
  'The Limpopo Department of Agriculture and Rural Development tomato guide says tomatoes prefer deep, well-aerated soils with organic matter. Organic matter supports soil structure and improves water and nutrient retention, infiltration and aeration. The guide reports best production around average temperatures of 20–24°C; temperatures above 30°C can negatively affect fruit set. Soil preparation should be adapted to soil texture rather than treated as one universal recipe. The guide describes preparation depths of 200–400 mm and contour-aligned ridging to help drainage and root-zone aeration.',
  array['Limpopo','Vhembe'],array['tomato']
from public.agri_knowledge_sources s
where s.source_url='https://www.ldard.gov.za/index.php/tomato-production-in-limpopo-province'
on conflict(source_id,chunk_index) do update set heading=excluded.heading,content=excluded.content,locality_tags=excluded.locality_tags,crop_tags=excluded.crop_tags;

insert into public.agri_knowledge_chunks(source_id,chunk_index,heading,content,locality_tags,crop_tags)
select s.id,1,'Tomato fertilisation, irrigation and crop health',
  'The Limpopo tomato guide says fertiliser programmes should be based on soil analysis and crop growth stage. It describes higher nitrogen demand during early vegetative growth, and calcium and magnesium needs during flowering, fruit set and fruit filling. It identifies drip or flood irrigation as methods used for tomatoes and notes that water demand changes with weather and growth stage, with the highest use around fruit set. It lists early and late blight, powdery mildew, Fusarium diseases, bacterial spot, Tuta absoluta and root-knot nematodes among tomato health concerns. For Tuta absoluta, the guide stresses resistance management and crop rotation. Confirm chemical choices and rates with a registered local extension officer and current product labels.',
  array['Limpopo','Vhembe'],array['tomato','irrigation','fertiliser','pest management']
from public.agri_knowledge_sources s
where s.source_url='https://www.ldard.gov.za/index.php/tomato-production-in-limpopo-province'
on conflict(source_id,chunk_index) do update set heading=excluded.heading,content=excluded.content,locality_tags=excluded.locality_tags,crop_tags=excluded.crop_tags;

insert into public.agri_knowledge_chunks(source_id,chunk_index,heading,content,locality_tags,crop_tags)
select s.id,0,'Local production guides available',
  'The Limpopo Department of Agriculture and Rural Development Crop Production Guide index links province-specific production guides for cabbage, carrot, onion, tomato, spinach and beetroot. Use the individual crop guide for crop-specific recommendations. The index itself is a catalogue and does not provide all production rates or planting calendars.',
  array['Limpopo','Vhembe'],array['cabbage','carrot','onion','tomato','spinach','beetroot']
from public.agri_knowledge_sources s
where s.source_url='https://www.ldard.gov.za/index.php/crop-production-guide'
on conflict(source_id,chunk_index) do update set heading=excluded.heading,content=excluded.content,locality_tags=excluded.locality_tags,crop_tags=excluded.crop_tags;

insert into public.agri_knowledge_chunks(source_id,chunk_index,heading,content,locality_tags,crop_tags)
select s.id,0,'Vhembe African leafy vegetable production resource',
  'The Water Research Commission lists a production guideline specifically covering African leafy vegetable cultivation in the Capricorn and Vhembe districts of Limpopo. This source is geographically relevant to Vhembe. The catalogue record identifies the publication and download, but detailed crop-specific practices must be checked in the full guideline before giving precise planting, fertiliser or pesticide recommendations.',
  array['Limpopo','Vhembe','Capricorn'],array['African leafy vegetables','indigenous vegetables']
from public.agri_knowledge_sources s
where s.source_url='https://www.wrc.org.za/mdocs-posts/production-guideline-for-african-leafy-vegetable-cultivation-in-the-capricorn-and-vhembe-districts-in-limpopo/'
on conflict(source_id,chunk_index) do update set heading=excluded.heading,content=excluded.content,locality_tags=excluded.locality_tags,crop_tags=excluded.crop_tags;

insert into public.agri_knowledge_chunks(source_id,chunk_index,heading,content,locality_tags,crop_tags)
select s.id,0,'ARC crop information and production resources',
  'The Agricultural Research Council Information Hub provides crop and production resources covering summer grains and oilseeds including maize, sorghum, cowpeas, dry beans, groundnuts, soybeans and sunflower, alongside crop protection and training information. The hub is an index to ARC resources; consult the linked crop-specific publication for detailed local recommendations.',
  array['South Africa','Limpopo'],array['maize','sorghum','cowpea','dry bean','groundnut','soybean','sunflower']
from public.agri_knowledge_sources s
where s.source_url='https://www.arc.agric.za/Pages/ARC-Information-Hub.aspx'
on conflict(source_id,chunk_index) do update set heading=excluded.heading,content=excluded.content,locality_tags=excluded.locality_tags,crop_tags=excluded.crop_tags;
