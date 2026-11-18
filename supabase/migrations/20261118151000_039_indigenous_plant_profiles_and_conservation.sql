-- Species-level indigenous plant notes from SANBI PlantZAfrica.
-- Important: threatened species records are conservation warnings, not collection instructions.
with seed(title,publisher,source_url,source_type,published_on,locality_tags,crop_tags,heading,content) as (
 values
 (
  'Brackenridgea zanguebarica (Mutavhatsindi): Conservation and Propagation Status',
  'South African National Biodiversity Institute, PlantZAfrica',
  'https://pza.sanbi.org/brackenridgea-zanguebarica',
  'extension','2025-10-01'::date,
  array['Mafukani','Mutale','Vhembe','Limpopo','South Africa']::text[],
  array['Mutavhatsindi','Brackenridgea zanguebarica','threatened medicinal plants','conservation']::text[],
  'Critically endangered Vhembe plant — do not wild-harvest',
  'SANBI PlantZAfrica describes Brackenridgea zanguebarica (Venda name Mutavhatsindi) as critically endangered in South Africa, with a small population at Mafukani in the Mutale area of Vhembe. The updated SANBI profile (October 2025) reports that propagation remains challenging, but a 2021 pilot achieved over 90% success with on-site air layering; stem cuttings had at least 30% rooting in trials, while seed germination remained very poor (1.5% in one trial). These are specialist conservation trials, not instructions for home propagation. The species remains critically endangered and wild harvesting has caused severe decline. Do not remove bark, roots, seedlings or seed from wild populations. Conservation work should be coordinated with SANBI, the provincial conservation authority and the relevant community; use only authorised, traceable propagation material in an approved programme.'
 ),
 (
  'Buddleja salviifolia: Indigenous Sagewood Propagation',
  'South African National Biodiversity Institute, PlantZAfrica',
  'https://pza.sanbi.org/buddleja-salviifolia',
  'extension',null::date,
  array['South Africa','Northern South Africa','Limpopo']::text[],
  array['Buddleja salviifolia','sagewood','indigenous medicinal plants','cuttings','seed propagation']::text[],
  'A documented indigenous shrub that can be propagated',
  'SANBI PlantZAfrica describes Buddleja salviifolia (sagewood) as a southern African indigenous shrub that can be propagated from seed or cuttings. Its profile describes hardwood cuttings taken during active growth, rooted in washed river sand kept moist for several weeks, then potted into a well-drained growing medium. It also describes raising the very fine seed in a fine seedling mix and watering from below to avoid displacing it. Young plants should be protected from frost during their first season; established plants are more frost- and drought-tolerant. Adapt timing to local rainfall and temperature and confirm the plant identity before propagation. Traditional-use records are not proof of medical effectiveness or safety.'
 ),
 (
  'Crotalaria natalitia: Indigenous Legume Propagation and Soil Role',
  'South African National Biodiversity Institute, PlantZAfrica',
  'https://pza.sanbi.org/crotalaria-natalitia-var-natalitia',
  'extension',null::date,
  array['Northern South Africa','Limpopo','Mpumalanga','South Africa']::text[],
  array['Crotalaria natalitia','indigenous legumes','traditional crops','nitrogen fixation','seed propagation']::text[],
  'Seed propagation and use in crop rotations',
  'SANBI PlantZAfrica describes Crotalaria natalitia var. natalitia as readily propagated from seed and adapted to warm conditions. Its profile gives a species-specific sowing description and notes that established plants can tolerate drier conditions after developing deep roots. It also describes the plant as a legume that can be intercropped with finger millet or maize, where its nitrogen-fixing capacity may benefit the companion crop. Follow the exact species profile and local extension advice rather than transferring its spacing or seed rate to other Crotalaria species. Do not use the plant as animal feed or medicine without species-specific safety guidance.'
 )
),
upsert_sources as (
 insert into public.agri_knowledge_sources
 (title,publisher,source_url,source_type,published_on,locality_tags,crop_tags,language,status,reviewed_at)
 select title,publisher,source_url,source_type,published_on,locality_tags,crop_tags,'en','approved',now() from seed
 on conflict(source_url) do update set title=excluded.title,publisher=excluded.publisher,
 source_type=excluded.source_type,published_on=excluded.published_on,
 locality_tags=excluded.locality_tags,crop_tags=excluded.crop_tags,
 status='approved',reviewed_at=now()
 returning id,source_url
)
insert into public.agri_knowledge_chunks(source_id,chunk_index,heading,content,locality_tags,crop_tags)
select s.id,0,d.heading,d.content,d.locality_tags,d.crop_tags
from seed d join upsert_sources s on s.source_url=d.source_url
on conflict(source_id,chunk_index) do update set heading=excluded.heading,
 content=excluded.content,locality_tags=excluded.locality_tags,crop_tags=excluded.crop_tags;
