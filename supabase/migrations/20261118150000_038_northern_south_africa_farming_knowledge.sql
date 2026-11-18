-- Curated Northern South Africa farming knowledge from verified public sources.
-- Source summaries are attributed; species-specific advice is kept separate from traditional-use records.
with seed(title,publisher,source_url,source_type,published_on,locality_tags,crop_tags,heading,content) as (
  values
  (
    'Climate Resilient Agriculture: Farmer Handouts (English)',
    'Water Research Commission and Mahlathini Development Foundation',
    'https://www.mahlathini.org/our-work/smallholder-decision-support-system/farmer-handouts-english/',
    'guideline','2021-02-01'::date,
    array['Limpopo','Vhembe','South Africa']::text[],
    array['soil fertility','manure','compost','green manure','seed saving','indigenous crops']::text[],
    'Manure, compost, green manure and soil protection',
    'The WRC-reviewed farmer handouts describe improving soil organic matter with kraal manure collected with urine-soaked grass or straw bedding, piled and covered; compost made from layers of dry plant material, green plant material, manure and soil, then wetted; crop residues and mulch; and legumes used as green manures. Legumes such as cowpea, lablab and other locally suitable pulses can fix atmospheric nitrogen through root nodules and benefit following crops. The guide says green manures are incorporated shortly before flowering. It also recommends minimal soil disturbance, keeping soil covered, crop diversification and rotation. These are practices to adapt to soil type, rainfall and crop needs, not a universal manure or fertiliser rate. Manure nutrient content varies; use soil analysis and local extension advice before setting application rates. The guide mentions a 5–7 day covered kraal-manure handling step, but this short period must not be represented as validated pathogen-kill composting or as a food-safety waiting period.'
  ),
  (
    'Indigenous and Traditional African Leafy Vegetables',
    'Agricultural Research Council',
    'https://www.arc.agric.za/arc-vopi/Pages/Crop%20Science/Indigenous-Crops.aspx',
    'government',null::date,
    array['Limpopo','Vhembe','Capricorn','South Africa']::text[],
    array['amaranthus','Cleome gynandra','Corchorus','Solanum retroflexum','cowpea','traditional pumpkin']::text[],
    'Locally relevant indigenous food crops and cultivation research',
    'The ARC identifies Amaranthus species, Cleome gynandra (spider plant), Corchorus species, Solanum retroflexum (nightshade), traditional pumpkin, cowpea and amadumbe among its indigenous or traditional crop research subjects. ARC describes research on planting dates, direct seeding versus seedlings, spacing, harvesting, water use and plant nutrition. It reports that Amaranthus, Corchorus and Cleome respond to soil fertility, while excessive nitrogen can produce overly succulent Cleome stems and reduce regrowth under repeated harvesting. ARC notes that species and cultivation information is still incomplete; therefore planting dates, spacing, irrigation and fertiliser rates must be selected from the relevant crop guide or local trial rather than guessed.'
  ),
  (
    'Guidelines on the Establishment and Management of Community Genebanks',
    'Southern African Development Community',
    'https://www.sadc.int/sites/default/files/2021-11/SPGRC_Guidelines_on_the_Establishment_and_Management_of_Community_Genebanks.pdf',
    'guideline','2020-08-01'::date,
    array['Southern Africa','Limpopo','Vhembe','South Africa']::text[],
    array['seed saving','seed bank','landraces','indigenous seeds','germination']::text[],
    'Seed quality, health, viability and community seed records',
    'The SADC community genebank guidelines require seed lots to be physically clean, free of visible pests and diseases, and checked for viability. They explain that viability is affected by seed age, harvest maturity, moisture content and storage temperature. Each seed accession should carry records such as species and variety, source farmer, collection location and year, growing conditions, useful traits, pest or disease response and cultural information shared with permission. Community seed banks should record deposits, exchanges and withdrawals and periodically test germination. Storage must be matched to seed biology: orthodox seeds tolerate drying and cool storage, while recalcitrant seeds are damaged by drying and may require living collections or other conservation methods. Do not apply one drying or freezer recipe to every indigenous species.'
  ),
  (
    'Preservation of Indigenous Food and Seeds',
    'South African Department of Agriculture, Forestry and Fisheries',
    'https://www.nda.gov.za/phocadownloadpap/Brochures_and_Production_Guidelines/Preservation%20of%20Indigenous%20Food%20and%20seeds.pdf',
    'government',null::date,
    array['South Africa','Limpopo','Vhembe']::text[],
    array['indigenous seeds','seed preservation','indigenous vegetables','food preservation']::text[],
    'Traditional and modern preservation methods',
    'The national brochure documents traditional preservation practices including air and sun drying, smoking, ash mixing, retaining protective coverings after harvest, shading and freezing. It describes drying seasonal indigenous leafy vegetables for later use and blanching leafy vegetables before freezing. For seed conservation at institutional scale it describes cleaned seed dried to a specified moisture content and stored in sealed aluminium bags at -18°C; this is a specialist conservation method, not a household instruction for all species. The correct moisture and temperature depend on whether a species has orthodox, intermediate or recalcitrant seed. For household seed lots, label the species and harvest date, remove damaged or diseased seed, dry only species that tolerate drying, and keep suitable dry seed cool, dark and protected from moisture and pests.'
  ),
  (
    'Baseline Study of Soil Nutrient Status in Smallholder Farms in Limpopo Province',
    'South African Journal of Agricultural Extension; Mokgolo and Mzezewa',
    'https://journals.co.za/doi/10.17159/2413-3221/2023/v51n1a11914',
    'research','2023-01-01'::date,
    array['Limpopo','Capricorn','Sekhukhune','Waterberg','South Africa']::text[],
    array['soil testing','soil fertility','phosphorus','potassium','calcium','magnesium','pH']::text[],
    'Why soil tests matter in Limpopo',
    'A 2023 study analysed 336 farmer soil samples from Capricorn, Sekhukhune and Waterberg. More than 80% of sampled soils had pH considered suitable for most field crops, while fewer than 20% required liming. Phosphorus was very low in at least 95% of the samples; potassium was adequate in most districts; and 70–74% of samples from Sekhukhune and Waterberg were calcium-deficient. The study stresses high variation between farms. These results are a regional warning to test soil, not a diagnosis of an individual field and not a blanket recommendation to apply phosphorus, lime or calcium. Collect representative samples and use an accredited soil laboratory or extension service to interpret results.'
  ),
  (
    'An Inventory of Vhavenḓa Useful Plants',
    'South African Journal of Botany; Magwede, van Wyk and van Wyk',
    'https://www.sciencedirect.com/science/article/pii/S0254629917314345',
    'research','2019-05-01'::date,
    array['Vhembe','Venda','Limpopo','South Africa']::text[],
    array['Vhavenḓa plants','traditional herbs','medicinal plants','indigenous knowledge','ethnobotany']::text[],
    'Documented Vhavenḓa plant diversity and traditional knowledge',
    'This peer-reviewed inventory documents 574 useful plant species recorded through literature review and interviews in Tshivenḓa-speaking communities in the Vhembe District, including 170 herbs and 897 vernacular names. It records a wide range of uses, including medicine, vegetables and edible fruits. The inventory is evidence of documented cultural and practical plant knowledge, not proof that every reported medicinal use is clinically effective and not a propagation manual. Local names can vary between villages and species; identify plants by a qualified botanist or herbarium voucher before propagation, sale or use. Record knowledge only with the informed permission of knowledge holders and communities.'
  ),
  (
    'Exploring Floristic Diversity and Medicinal Plant Uses in Venda, Limpopo, South Africa',
    'Feddes Repertorium; 2026 research article',
    'https://onlinelibrary.wiley.com/doi/10.1002/fedr.70111',
    'research','2026-05-25'::date,
    array['Venda','Vhembe','Limpopo','South Africa']::text[],
    array['traditional herbs','medicinal plants','ethnobotany','plant conservation']::text[],
    'Recent documented medicinal flora in the Venda region',
    'A 2026 floristic study in Shanzha and surrounding Venda villages documented 151 plant species from 58 families, based on botanical identification and local knowledge. The study records plant parts and reported traditional uses, while noting that only a small number of plants have been scientifically screened for biological activity. This record should be used to support plant identification, conservation and knowledge documentation, not as a medical treatment guide. Do not publish recipes, dosages or restricted knowledge without the knowledge holders’ permission. Prioritise cultivated, legally sourced planting material and check conservation status before collecting any wild plant.'
  ),
  (
    'PlantZAfrica: Aloe Species and Propagation',
    'South African National Biodiversity Institute',
    'https://plantzafrica.com/plantab/aloe.html',
    'extension',null::date,
    array['South Africa','Limpopo','Northern South Africa']::text[],
    array['Aloe','indigenous succulents','medicinal plants','seed propagation','cuttings']::text[],
    'Species-aware propagation notes for indigenous aloes',
    'SANBI PlantZAfrica describes propagation methods for Aloe species, including sowing fresh seed in a free-draining medium, lightly covering seed, protecting young seedlings from harsh sun and excess water, and using offsets or cuttings for suitable species. The correct method differs between Aloe species. Do not treat all aloes as interchangeable, assume medicinal efficacy, or harvest protected plants from the wild. Confirm the exact species, conservation status and lawful source of seed or cuttings before growing or trading.'
  )
),
inserted_sources as (
  insert into public.agri_knowledge_sources
    (title,publisher,source_url,source_type,published_on,locality_tags,crop_tags,language,status,reviewed_at)
  select title,publisher,source_url,source_type,published_on,locality_tags,crop_tags,'en','approved',now()
  from seed
  on conflict (source_url) do update set
    title=excluded.title,publisher=excluded.publisher,source_type=excluded.source_type,
    published_on=excluded.published_on,locality_tags=excluded.locality_tags,
    crop_tags=excluded.crop_tags,language=excluded.language,status='approved',reviewed_at=now()
  returning id,source_url
)
insert into public.agri_knowledge_chunks
  (source_id,chunk_index,heading,content,locality_tags,crop_tags)
select s.id,0,d.heading,d.content,d.locality_tags,d.crop_tags
from seed d
join public.agri_knowledge_sources s on s.source_url=d.source_url
on conflict (source_id,chunk_index) do update set
  heading=excluded.heading,content=excluded.content,
  locality_tags=excluded.locality_tags,crop_tags=excluded.crop_tags;
