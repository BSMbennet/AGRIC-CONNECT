-- Add reviewed-source candidates to the existing AGRIC-CONNECT knowledge base.
-- Sources remain pending until an authorized agricultural reviewer approves them.
-- Idempotent: source_url is unique and each source receives one initial chunk.

with seed(title,publisher,source_url,source_type,published_on,locality_tags,crop_tags,heading,content) as (
  values
  (
    'Limpopo Crop Production Guides',
    'Limpopo Department of Agriculture and Rural Development',
    'https://www.ldard.gov.za/index.php/crop-production-guide',
    'government',null::date,
    array['Limpopo','Vhembe','South Africa']::text[],
    array['cabbage','carrot','onion','tomato','spinach','beetroot','vegetables']::text[],
    'Provincial crop guide index',
    'The provincial crop guide index links crop-specific production guides for cabbage, carrot, onion, tomato, spinach and beetroot. Consult the individual guide for crop-specific practices and confirm current recommendations with a local extension officer. The index is not a planting calendar or live weather forecast.'
  ),
  (
    'Production Guide for Spinach in Limpopo Province',
    'Limpopo Department of Agriculture and Rural Development',
    'https://www.ldard.gov.za/index.php/production-guide-for-spinach-in-limpopo-province',
    'government',null::date,
    array['Limpopo','Vhembe','South Africa']::text[],
    array['spinach','vegetables','soil','drainage']::text[],
    'Spinach soil and climate considerations',
    'The provincial guide covers spinach distribution, soil and climatic requirements, and cultural practices. It describes well-drained, fertile soils as preferable and warns that saturated soil and soil acidity can limit production. Use the full guide and a local soil test before choosing amendments or a fertiliser programme.'
  ),
  (
    'Poultry Farming for Beginners: Part 1',
    'Agricultural Research Council',
    'https://www.arc.agric.za/Agricultural%20Sector%20News/Poultry%20farming%20for%20beginners%20-%20Part%201.pdf',
    'guideline','2022-07-01'::date,
    array['South Africa','Limpopo']::text[],
    array['poultry','broiler','layers','chicks','housing','biosecurity']::text[],
    'Small-scale poultry planning and brooding',
    'This ARC beginner article discusses planning a small-scale poultry enterprise, evaluating markets and resources, housing and equipment, and brooding chicks. It stresses planning for a market and reliable access to basic equipment, feed and vaccines. It is introductory guidance, not a substitute for veterinary diagnosis, vaccination schedules or outbreak biosecurity advice.'
  ),
  (
    'Climate-Smart Agriculture Toolkit',
    'Agricultural Research Council',
    'https://www.arc.agric.za/arc-iscw/CSA-Toolbox/Pages/default.aspx',
    'guideline',null::date,
    array['South Africa','Limpopo','Vhembe']::text[],
    array['climate-smart','soil','water','beef','dairy','goats','sheep','pasture','poultry','grains','fruit','vegetables']::text[],
    'Climate-smart crop and livestock modules',
    'The ARC toolkit provides training modules for climate-smart agriculture, including soil and water management, agrometeorology, beef and dairy production, small stock, veld and pasture, poultry, summer grains and legumes, fruit and vegetable production. Use the relevant module for the production system and adapt it to local extension guidance and actual farm conditions.'
  ),
  (
    'How Livestock Farmers Can Break Even the Global Market',
    'Limpopo Department of Agriculture and Rural Development',
    'https://www.ldard.gov.za/index.php/news/how-livestock-farmers-can-breakeven-the-global-market',
    'government','2024-08-29'::date,
    array['Limpopo','Capricorn','Vhembe','South Africa']::text[],
    array['livestock','cattle','goat','sheep','breeding','grazing','animal records']::text[],
    'Livestock records and grazing resources',
    'The provincial department article highlights animal identification and production records covering birth, breeding, weaning and mature weight, alongside management of grazing carrying capacity, water and soil. It is a management overview, not veterinary treatment advice or a current livestock price quotation.'
  ),
  (
    'Opportunities to Improve Operation of Smallholder Canal Schemes in Vhembe, Limpopo Province',
    'Water Research Commission',
    'https://search.wrc.org.za/reports/3b1c7d13-1b2f-42ab-a730-74d2451df504',
    'research','2023-03-30'::date,
    array['Vhembe','Limpopo','South Africa']::text[],
    array['irrigation','water','smallholder','canal','infrastructure']::text[],
    'Vhembe smallholder irrigation scheme operations',
    'This WRC research report examines operation of smallholder irrigation schemes in Vhembe. It provides local systems context for shared canal infrastructure, scheme performance and the role of irrigation in smallholder production. It is not a current water allocation notice or a crop-specific irrigation prescription.'
  )
),
inserted_sources as (
  insert into public.agri_knowledge_sources
    (title,publisher,source_url,source_type,published_on,locality_tags,crop_tags,language,status,reviewed_at)
  select title,publisher,source_url,source_type,published_on,locality_tags,crop_tags,'en','pending',null
  from seed
  on conflict (source_url) do nothing
  returning id,source_url
)
insert into public.agri_knowledge_chunks
  (source_id,chunk_index,heading,content,locality_tags,crop_tags)
select s.id,0,d.heading,d.content,d.locality_tags,d.crop_tags
from seed d
join public.agri_knowledge_sources s on s.source_url=d.source_url
where not exists (
  select 1 from public.agri_knowledge_chunks c
  where c.source_id=s.id and c.chunk_index=0
);
