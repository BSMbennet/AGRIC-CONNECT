-- 033: add Vhembe-specific university research to the approved agricultural corpus
insert into public.agri_knowledge_sources(title,publisher,source_url,source_type,locality_tags,crop_tags,status,reviewed_at)
values (
  'Climate and soil suitability for maize, dry bean and sweet potato in Vhembe District',
  'University of the Free State repository',
  'https://scholar.ufs.ac.za/server/api/core/bitstreams/cc6322b6-04fd-440f-8dd3-b04baf464409/content',
  'research',array['Vhembe','Limpopo'],array['maize','dry bean','sweet potato','climate','soil'],'approved',now()
)
on conflict(source_url) do update set title=excluded.title,publisher=excluded.publisher,locality_tags=excluded.locality_tags,crop_tags=excluded.crop_tags,status='approved',reviewed_at=now();

insert into public.agri_knowledge_chunks(source_id,chunk_index,heading,content,locality_tags,crop_tags)
select s.id,0,'Vhembe smallholder crop suitability study',
  'A University of the Free State repository study examines climate and soil suitability for maize, dry bean and sweet potato production in two Vhembe settings: the Madimbo Corridor in Musina Local Municipality and the Upper Mutale Valley in Thulamela Local Municipality. It reports substantial site differences, including lower annual rainfall in Madimbo, and compares local conditions with crop water and temperature requirements. Use this as geographic research context, not as a substitute for current field soil tests, seasonal forecasts or extension advice for a specific farm.',
  array['Vhembe','Limpopo'],array['maize','dry bean','sweet potato','climate','soil']
from public.agri_knowledge_sources s
where s.source_url='https://scholar.ufs.ac.za/server/api/core/bitstreams/cc6322b6-04fd-440f-8dd3-b04baf464409/content'
on conflict(source_id,chunk_index) do update set heading=excluded.heading,content=excluded.content,locality_tags=excluded.locality_tags,crop_tags=excluded.crop_tags;
