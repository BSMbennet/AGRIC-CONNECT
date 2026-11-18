-- Include source titles and crop tags in agricultural knowledge search.
-- This makes topic searches such as "seed saving" match source metadata as well as chunk prose.
create or replace function public.search_agri_knowledge(
  query_text text,
  locality_filter text default null,
  crop_filter text default null,
  result_limit integer default 5
)
returns table(
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
set search_path=''
as $$
  with q as (
    select websearch_to_tsquery('simple', coalesce(query_text,'')) as tsq
  ),
  docs as (
    select
      c.id as chunk_id,
      s.id as source_id,
      s.title,
      s.publisher,
      s.source_url,
      s.published_on,
      c.heading,
      c.content,
      c.locality_tags,
      c.crop_tags,
      c.search_document,
      to_tsvector(
        'simple',
        concat_ws(
          ' ',
          coalesce(s.title,''),
          coalesce(array_to_string(s.crop_tags,' '),''),
          coalesce(array_to_string(c.crop_tags,' '),'')
        )
      ) as metadata_document
    from public.agri_knowledge_chunks c
    join public.agri_knowledge_sources s on s.id=c.source_id
    where s.status='approved'
  )
  select
    d.chunk_id,d.source_id,d.title,d.publisher,d.source_url,d.published_on,
    d.heading,d.content,d.locality_tags,d.crop_tags,
    greatest(
      ts_rank_cd(d.search_document,q.tsq),
      ts_rank_cd(d.metadata_document,q.tsq)
    )::real as rank
  from docs d
  cross join q
  where char_length(trim(coalesce(query_text,'')))>=2
    and numnode(q.tsq)>0
    and (d.search_document @@ q.tsq or d.metadata_document @@ q.tsq)
    and (
      locality_filter is null
      or d.locality_tags && array[locality_filter,'Vhembe','Limpopo']::text[]
      or exists(
        select 1 from public.agri_knowledge_sources s
        where s.id=d.source_id
          and s.locality_tags && array[locality_filter,'Vhembe','Limpopo']::text[]
      )
    )
    and (
      crop_filter is null
      or d.crop_tags && array[crop_filter]::text[]
      or exists(
        select 1 from public.agri_knowledge_sources s
        where s.id=d.source_id
          and s.crop_tags && array[crop_filter]::text[]
      )
    )
  order by rank desc,d.published_on desc nulls last
  limit greatest(1,least(coalesce(result_limit,5),8));
$$;
revoke all on function public.search_agri_knowledge(text,text,text,integer) from public,anon;
grant execute on function public.search_agri_knowledge(text,text,text,integer) to authenticated;
