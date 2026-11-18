export type AgriculturalKnowledgeDocument = {
  id: string;
  title: string;
  topic: string;
  cropCategory: string;
  geographicRelevance: string[];
  language: "en";
  source: string;
  sourceUrl: string;
  publicationDate: string;
  lastVerifiedAt: string;
  verificationStatus: "verified";
  summary: string;
  keywords: string[];
  caution?: string;
};

// Curated starter corpus. Summaries are short notes from the cited sources, not new
// agronomic recommendations. Expand only after source and date review.
export const agriculturalKnowledge: AgriculturalKnowledgeDocument[] = [
  {
    id: "ldard-tomato-limpopo",
    title: "Tomato Production in Limpopo Province",
    topic: "crop production, soil, irrigation, pests and diseases",
    cropCategory: "tomato",
    geographicRelevance: ["Limpopo", "South Africa", "Vhembe"],
    language: "en",
    source: "Limpopo Department of Agriculture and Rural Development",
    sourceUrl: "https://www.ldard.gov.za/index.php/tomato-production-in-limpopo-province",
    publicationDate: "Not stated on source page",
    lastVerifiedAt: "2026-11-18",
    verificationStatus: "verified",
    summary: "The provincial guide describes tomatoes as suited to deep, well-aerated soils with organic matter. It notes that temperatures above 30°C can reduce fruit set, recommends basing fertiliser programmes on soil analysis, and discusses irrigation scheduling by weather and crop stage. It identifies diseases including early and late blight and pests including Tuta absoluta and root-knot nematodes. It recommends resistance management and crop rotation for Tuta absoluta.",
    keywords: ["tomato", "tomatoes", "matamatisi", "tuta absoluta", "blight", "fruit set", "irrigation", "fertiliser", "fertilizer", "nematode", "soil", "pest", "disease", "limpopo"]
  },
  {
    id: "wrc-arc-african-leafy-vegetables-vhembe",
    title: "Production Guideline for African Leafy Vegetable Cultivation in the Capricorn and Vhembe Districts in Limpopo",
    topic: "indigenous crops, vegetable production, soil, seedlings, irrigation and post-harvest",
    cropCategory: "African leafy vegetables",
    geographicRelevance: ["Vhembe", "Capricorn", "Limpopo", "South Africa"],
    language: "en",
    source: "Water Research Commission and Agricultural Research Council, Report TT 914/23",
    sourceUrl: "https://www.wrc.org.za/wp-content/uploads/mdocs/TT%20914%20final%20web.pdf",
    publicationDate: "2023-05",
    lastVerifiedAt: "2026-11-18",
    verificationStatus: "verified",
    summary: "This locally relevant production guideline was prepared with ARC contributors and focuses on smallholder farmers in Vhembe and Capricorn. Its contents cover soil preparation and soil testing, seedling production, cultivation, fertilisation, mulching, irrigation system maintenance and scheduling, harvesting, and post-harvest handling of perishable produce.",
    keywords: ["African leafy vegetables", "indigenous vegetables", "morogo", "thepe", "munyaku", "muxe", "leafy", "seedlings", "soil testing", "mulch", "mulching", "irrigation", "harvesting", "post-harvest", "vhembe", "capricorn"]
  },
  {
    id: "dalrrd-maize-production-guide",
    title: "Maize Production Guide",
    topic: "maize production, planting, soil and climate",
    cropCategory: "maize",
    geographicRelevance: ["South Africa"],
    language: "en",
    source: "South African Department of Agriculture, Forestry and Fisheries (legacy national production guide)",
    sourceUrl: "https://www.dlrrd.gov.za/phocadownloadpap/Brochures_and_Production_Guidelines/Brochure%20Maize.pdf",
    publicationDate: "2008",
    lastVerifiedAt: "2026-11-18",
    verificationStatus: "verified",
    summary: "The national guide describes maize seed depth as generally 5–10 cm depending on soil type and planting date, stresses soil sampling for fertiliser recommendations, and gives broad planting windows by production region. It is an older national guide and does not provide a current Vhembe-specific planting forecast.",
    keywords: ["maize", "mielies", "mavhele", "mafela", "mmopo", "umbila", "umbona", "planting", "planting depth", "seed depth", "fertiliser", "fertilizer", "rainfall", "soil"]
  },
  {
    id: "grainsa-limpopo-maize-season-2025",
    title: "Production Conditions Report — 12 December 2025",
    topic: "seasonal crop conditions and regional planting windows",
    cropCategory: "maize and field crops",
    geographicRelevance: ["Limpopo", "South Africa"],
    language: "en",
    source: "Grain SA",
    sourceUrl: "https://www.grainsa.co.za/upload/report_files/Production-Conditions-Report-12-December-2025.pdf",
    publicationDate: "2025-12-12",
    lastVerifiedAt: "2026-11-18",
    verificationStatus: "verified",
    summary: "The 2025/26 season report listed an optimal maize planting window of 1 November to 31 December for its Limpopo region. This is a dated seasonal reference, not a forecast or planting recommendation for the current 2026/27 season. Actual dryland planting depends on rainfall onset, soil moisture, cultivar maturity and local extension advice.",
    keywords: ["maize", "mielies", "limpopo", "planting window", "planting date", "rainfall", "seasonal", "dryland", "soil moisture", "2025", "2026"]
  },
  {
    id: "wrc-vhembe-irrigation-study-2026",
    title: "Smallholder Agricultural Entrepreneurs' Irrigation Water Supply and Utilisation in Vhembe District",
    topic: "irrigation, water access and smallholder farm management",
    cropCategory: "multiple crops",
    geographicRelevance: ["Vhembe", "Limpopo", "South Africa"],
    language: "en",
    source: "South African Journal of Agricultural Extension, Volume 54 Issue 3",
    sourceUrl: "https://www.scielo.org.za/scielo.php?pid=S0301-603X2026000300004&script=sci_arttext",
    publicationDate: "2026-07-01",
    lastVerifiedAt: "2026-11-18",
    verificationStatus: "verified",
    summary: "A 2026 study of irrigated smallholder enterprises in Vhembe reported surface water and groundwater as important sources and found irrigation scheduling was often based on intuition and rotation rather than scientific scheduling. It is local research context, not a crop-specific irrigation prescription.",
    keywords: ["vhembe", "irrigation", "water", "groundwater", "surface water", "smallholder", "water supply", "irrigation schedule", "climate"]
  },
  {
    id: "ldard-limpopo-crop-guide-index",
    title: "Limpopo Crop Production Guides",
    topic: "crop production, horticulture, vegetables and field crops",
    cropCategory: "multiple crops",
    geographicRelevance: ["Limpopo", "Vhembe", "South Africa"],
    language: "en",
    source: "Limpopo Department of Agriculture and Rural Development",
    sourceUrl: "https://www.ldard.gov.za/index.php/crop-production-guide",
    publicationDate: "Not stated on index page",
    lastVerifiedAt: "2026-11-18",
    verificationStatus: "verified",
    summary: "The provincial crop guide index links crop-specific production guides for cabbage, carrot, onion, tomato, spinach and beetroot. Use the individual guide for crop-specific practices and confirm current recommendations with a local extension officer; the index itself is not a planting calendar or live weather forecast.",
    keywords: ["cabbage", "carrot", "onion", "spinach", "beetroot", "tomato", "vegetable", "vegetables", "horticulture", "crop guide", "limpopo", "vhembe"]
  },
  {
    id: "ldard-spinach-limpopo",
    title: "Production Guide for Spinach in Limpopo Province",
    topic: "spinach production, soil, climate and planting",
    cropCategory: "spinach",
    geographicRelevance: ["Limpopo", "Vhembe", "South Africa"],
    language: "en",
    source: "Limpopo Department of Agriculture and Rural Development",
    sourceUrl: "https://www.ldard.gov.za/index.php/production-guide-for-spinach-in-limpopo-province",
    publicationDate: "Not stated on source page",
    lastVerifiedAt: "2026-11-18",
    verificationStatus: "verified",
    summary: "The provincial guide covers spinach distribution, soil and climatic requirements, and cultural practices. It describes well-drained, fertile soils as preferable and warns that saturated soil and soil acidity can limit production. Use the full guide and local soil test before choosing amendments or a fertiliser programme.",
    keywords: ["spinach", "muroho", "soil", "drainage", "acidity", "planting", "vegetables", "limpopo"]
  },
  {
    id: "arc-poultry-beginners",
    title: "Poultry Farming for Beginners: Part 1",
    topic: "poultry housing, brooding, equipment and farm planning",
    cropCategory: "poultry",
    geographicRelevance: ["South Africa", "Limpopo"],
    language: "en",
    source: "Agricultural Research Council",
    sourceUrl: "https://www.arc.agric.za/Agricultural%20Sector%20News/Poultry%20farming%20for%20beginners%20-%20Part%201.pdf",
    publicationDate: "2022-07",
    lastVerifiedAt: "2026-11-18",
    verificationStatus: "verified",
    summary: "This ARC beginner article discusses planning a small-scale poultry enterprise, evaluating markets and resources, housing and equipment, and brooding chicks. It stresses planning for a market and reliable access to basic equipment, feed and vaccines. It is introductory guidance, not a substitute for veterinary diagnosis, vaccination schedules or biosecurity advice for an outbreak.",
    keywords: ["poultry", "chicken", "broiler", "layers", "eggs", "chicks", "brooding", "housing", "feed", "vaccination", "biosecurity", "livestock"]
  },
  {
    id: "arc-climate-smart-agriculture-toolkit",
    title: "Climate-Smart Agriculture Toolkit",
    topic: "climate-smart crop and livestock production, soil and water management",
    cropCategory: "multiple crops and livestock",
    geographicRelevance: ["South Africa", "Limpopo", "Vhembe"],
    language: "en",
    source: "Agricultural Research Council",
    sourceUrl: "https://www.arc.agric.za/arc-iscw/CSA-Toolbox/Pages/default.aspx",
    publicationDate: "Not stated on toolkit index",
    lastVerifiedAt: "2026-11-18",
    verificationStatus: "verified",
    summary: "The ARC toolkit provides training modules for climate-smart agriculture, including soil and water management, agrometeorology, beef and dairy production, small stock, veld and pasture, poultry, summer grains and legumes, fruit and vegetable production. Use the relevant module for the production system and adapt it to local extension guidance and actual farm conditions.",
    keywords: ["climate smart", "climate change", "drought", "soil", "water", "beef", "dairy", "goats", "sheep", "pasture", "poultry", "grains", "legumes", "fruit", "vegetables", "livestock"]
  },
  {
    id: "ldard-livestock-recordkeeping",
    title: "How Livestock Farmers Can Break Even the Global Market",
    topic: "livestock management, animal records and grazing resources",
    cropCategory: "livestock",
    geographicRelevance: ["Limpopo", "Capricorn", "Vhembe", "South Africa"],
    language: "en",
    source: "Limpopo Department of Agriculture and Rural Development",
    sourceUrl: "https://www.ldard.gov.za/index.php/news/how-livestock-farmers-can-breakeven-the-global-market",
    publicationDate: "2024-08-29",
    lastVerifiedAt: "2026-11-18",
    verificationStatus: "verified",
    summary: "The provincial department article highlights animal identification and production records covering birth, breeding, weaning and mature weight, alongside management of grazing carrying capacity, water and soil. It is a management overview, not veterinary treatment advice or a current livestock price quotation.",
    keywords: ["livestock", "cattle", "goat", "sheep", "animal records", "breeding", "weaning", "grazing", "veld", "carrying capacity", "water", "soil", "farm management"]
  },
  {
    id: "wrc-vhembe-irrigation-schemes",
    title: "Opportunities to Improve Operation of Smallholder Canal Schemes in Vhembe, Limpopo Province",
    topic: "smallholder irrigation infrastructure and water management",
    cropCategory: "multiple crops",
    geographicRelevance: ["Vhembe", "Limpopo", "South Africa"],
    language: "en",
    source: "Water Research Commission",
    sourceUrl: "https://search.wrc.org.za/reports/3b1c7d13-1b2f-42ab-a730-74d2451df504",
    publicationDate: "2023-03-30",
    lastVerifiedAt: "2026-11-18",
    verificationStatus: "verified",
    summary: "This WRC research report examines operation of smallholder irrigation schemes in Vhembe. It provides local systems context for shared canal infrastructure, scheme performance and the role of irrigation in smallholder production. It should inform questions about scheme management, not be treated as a current water allocation notice or a crop-specific irrigation prescription.",
    keywords: ["irrigation", "canal", "water", "smallholder", "scheme", "vhembe", "limpopo", "water management", "infrastructure"]
  },
  {
    id: "wrc-smallholder-soil-manure-seed-saving",
    title: "Climate-resilient soil fertility, manure and seed-saving practices",
    topic: "soil fertility, manure, compost, green manure, mulching and seed preservation",
    cropCategory: "multiple crops and indigenous vegetables",
    geographicRelevance: ["Limpopo", "Vhembe", "South Africa"],
    language: "en",
    source: "Water Research Commission and Mahlathini Development Foundation, Farmer Handouts TT 841/6/20",
    sourceUrl: "https://www.mahlathini.org/our-work/smallholder-decision-support-system/farmer-handouts-english/",
    publicationDate: "2021-02",
    lastVerifiedAt: "2026-11-18",
    verificationStatus: "verified",
    summary: "The WRC-reviewed handouts explain improving organic matter with covered kraal manure, compost built from alternating dry plant matter, green material, manure and soil, crop residues and mulch. They describe legumes such as cowpea and lablab as green manures that fix atmospheric nitrogen, and advise incorporating green manure shortly before flowering. They recommend seed saving from healthy open-pollinated plants, avoiding diseased plants, separating crops that cross-pollinate, and keeping suitable dry seed cool, dark and dry. The guide's short covered-manure handling step is not a validated pathogen-kill composting process. Manure and fertiliser rates must be based on soil tests and crop needs.",
    keywords: ["manure", "kraal manure", "cattle manure", "goat manure", "chicken manure", "compost", "green manure", "cowpea", "lablab", "mulch", "soil organic matter", "soil fertility", "seed saving", "seed storage", "open pollinated", "Vhembe", "Limpopo"]
  },
  {
    id: "arc-indigenous-leafy-vegetables-north",
    title: "Indigenous and Traditional African Leafy Vegetables",
    topic: "indigenous crops, planting, crop nutrition and harvesting",
    cropCategory: "African leafy vegetables",
    geographicRelevance: ["Limpopo", "Vhembe", "Capricorn", "South Africa"],
    language: "en",
    source: "Agricultural Research Council",
    sourceUrl: "https://www.arc.agric.za/arc-vopi/Pages/Crop%20Science/Indigenous-Crops.aspx",
    publicationDate: "Not stated on source page",
    lastVerifiedAt: "2026-11-18",
    verificationStatus: "verified",
    summary: "ARC identifies Amaranthus, Cleome gynandra (spider plant), Corchorus, Solanum retroflexum (nightshade), traditional pumpkin, cowpea and amadumbe among indigenous or traditional crops studied in South Africa. Its research covers planting dates, direct seeding and seedlings, spacing, harvesting, water use and plant nutrition. ARC reports that these crops can respond to improved fertility, while excessive nitrogen can reduce regrowth in repeatedly harvested Cleome. Crop-specific planting and fertiliser rates should come from the relevant production guide or local extension advice.",
    keywords: ["thepe", "imbuya", "amaranthus", "spider plant", "Cleome gynandra", "lerotho", "bangala", "Corchorus", "delele", "gushe", "nightshade", "Solanum retroflexum", "cowpea", "traditional pumpkin", "amadumbe", "indigenous vegetables", "morogo"]
  },
  {
    id: "sadc-community-genebank-guidelines",
    title: "Community Seed Banks: Seed Quality and Conservation",
    topic: "seed saving, seed banks, germination testing and indigenous varieties",
    cropCategory: "seeds and landraces",
    geographicRelevance: ["Southern Africa", "Limpopo", "Vhembe", "South Africa"],
    language: "en",
    source: "Southern African Development Community, 2020 Community Genebank Guidelines",
    sourceUrl: "https://www.sadc.int/sites/default/files/2021-11/SPGRC_Guidelines_on_the_Establishment_and_Management_of_Community_Genebanks.pdf",
    publicationDate: "2020-08",
    lastVerifiedAt: "2026-11-18",
    verificationStatus: "verified",
    summary: "SADC guidelines say stored seed lots should be clean, free of visible pests and disease, and tested for viability. Seed records should include species or variety, source farmer, collection location and year, growing conditions and useful traits. Storage requirements depend on seed biology: orthodox seeds tolerate drying and cool storage, while recalcitrant seeds are damaged by drying. Community seed banks should document deposits and exchanges and periodically check germination rather than assume all stored seed remains viable.",
    keywords: ["community seed bank", "seed bank", "seed saving", "seed viability", "germination test", "seed purity", "seed pests", "landrace", "orthodox seed", "recalcitrant seed", "indigenous seed", "SADC"]
  },
  {
    id: "dalrrd-indigenous-food-seed-preservation",
    title: "Preservation of Indigenous Food and Seeds",
    topic: "traditional seed and food preservation",
    cropCategory: "indigenous vegetables and seeds",
    geographicRelevance: ["South Africa", "Limpopo", "Vhembe"],
    language: "en",
    source: "South African Department of Agriculture, Forestry and Fisheries",
    sourceUrl: "https://www.nda.gov.za/phocadownloadpap/Brochures_and_Production_Guidelines/Preservation%20of%20Indigenous%20Food%20and%20seeds.pdf",
    publicationDate: "Not stated on brochure",
    lastVerifiedAt: "2026-11-18",
    verificationStatus: "verified",
    summary: "The national brochure documents traditional preservation practices such as air and sun drying, smoking, ash mixing, shading and freezing. It describes drying seasonal leafy vegetables for later use and blanching vegetables before freezing. Its -18°C seed conservation example is a specialist method for appropriately prepared seed, not a universal household method. Seed drying and storage must match the species: some seeds are damaged by drying or chilling.",
    keywords: ["indigenous food", "seed preservation", "seed storage", "drying", "sun drying", "freezing", "blanching", "traditional vegetables", "ash", "South Africa"]
  },
  {
    id: "limpopo-smallholder-soil-nutrient-study",
    title: "Soil Nutrient Status in Smallholder Farms in Limpopo",
    topic: "soil testing, pH, phosphorus, potassium, calcium and magnesium",
    cropCategory: "multiple crops",
    geographicRelevance: ["Limpopo", "Capricorn", "Sekhukhune", "Waterberg", "South Africa"],
    language: "en",
    source: "South African Journal of Agricultural Extension, Mokgolo and Mzezewa (2023)",
    sourceUrl: "https://journals.co.za/doi/10.17159/2413-3221/2023/v51n1a11914",
    publicationDate: "2023-01",
    lastVerifiedAt: "2026-11-18",
    verificationStatus: "verified",
    summary: "A study of 336 farmer soil samples from Capricorn, Sekhukhune and Waterberg found substantial variation between farms. More than 80% of sampled soils had pH suitable for most field crops, at least 95% had very low phosphorus, potassium was adequate in most districts, and calcium deficiency was common in Sekhukhune and Waterberg samples. These are regional sample findings, not a diagnosis of every Limpopo field. Farmers should test their own soil before applying lime or fertiliser.",
    keywords: ["soil test", "soil testing", "soil fertility", "pH", "phosphorus", "P", "potassium", "K", "calcium", "magnesium", "lime", "Limpopo", "Sekhukhune", "Capricorn", "Waterberg"]
  },
  {
    id: "vha-venda-useful-plants-inventory",
    title: "An Inventory of Vhavenḓa Useful Plants",
    topic: "traditional herbs, ethnobotany, medicinal plants and indigenous knowledge",
    cropCategory: "indigenous and medicinal plants",
    geographicRelevance: ["Vhembe", "Venda", "Limpopo", "South Africa"],
    language: "en",
    source: "South African Journal of Botany; Magwede, van Wyk and van Wyk (2019)",
    sourceUrl: "https://www.sciencedirect.com/science/article/pii/S0254629917314345",
    publicationDate: "2019-05",
    lastVerifiedAt: "2026-11-18",
    verificationStatus: "verified",
    summary: "This peer-reviewed inventory documents 574 useful plant species known to Vhavenḓa communities in the Vhembe District, including herbs, shrubs, trees and climbers, and records 897 vernacular names. It is a valuable starting point for documenting local plant diversity and knowledge. It does not provide cultivation instructions or establish clinical efficacy. Local names can vary, so identify a plant botanically before propagating, selling or using it, and obtain community permission before publishing sensitive knowledge.",
    keywords: ["Vhavenḓa", "Venda", "Tshivenda", "Vhembe", "traditional herbs", "medicinal plants", "useful plants", "ethnobotany", "indigenous knowledge", "plant names", "rare plants"]
  },
  {
    id: "venda-medicinal-flora-2026",
    title: "Medicinal Plant Diversity Recorded in the Venda Region",
    topic: "medicinal plant identification, conservation and traditional knowledge",
    cropCategory: "medicinal and indigenous plants",
    geographicRelevance: ["Venda", "Vhembe", "Limpopo", "South Africa"],
    language: "en",
    source: "Feddes Repertorium (2026), floristic study in Shanzha and surrounding villages",
    sourceUrl: "https://onlinelibrary.wiley.com/doi/10.1002/fedr.70111",
    publicationDate: "2026-05-25",
    lastVerifiedAt: "2026-11-18",
    verificationStatus: "verified",
    summary: "A 2026 study documented 151 plant species from 58 families in the Venda region, using botanical identification and information from local residents. It records traditional uses but notes that only a small number of the plants have been scientifically screened. Use this source for biodiversity and knowledge documentation, not as a treatment guide. Do not infer cultivation methods, dosages or safety from a traditional-use record. Check conservation status and use legally sourced planting material.",
    keywords: ["Venda", "Vhembe", "Shanzha", "medicinal plants", "traditional herbs", "151 species", "plant conservation", "ethnobotany", "indigenous knowledge"]
  },
  {
    id: "sanbi-aloe-propagation",
    title: "Growing and Propagating Indigenous Aloe Species",
    topic: "indigenous plant propagation, seed sowing and cuttings",
    cropCategory: "Aloe and indigenous succulents",
    geographicRelevance: ["South Africa", "Limpopo", "Northern South Africa"],
    language: "en",
    source: "South African National Biodiversity Institute, PlantZAfrica",
    sourceUrl: "https://plantzafrica.com/plantab/aloe.html",
    publicationDate: "Not stated on source page",
    lastVerifiedAt: "2026-11-18",
    verificationStatus: "verified",
    summary: "SANBI PlantZAfrica explains that Aloe propagation differs by species. General methods include sowing fresh seed in a free-draining medium, lightly covering it, protecting young seedlings from harsh sun and excess water, and using offsets or cuttings for species that produce them. Confirm the exact species and its conservation status before collecting or trading seed and cuttings. These horticultural notes do not establish medicinal efficacy or safe medicinal use.",
    keywords: ["Aloe", "Aloe arborescens", "Aloe ferox", "aloe propagation", "indigenous herbs", "succulent", "seed", "cuttings", "offsets", "SANBI", "PlantZAfrica"]
  },

  {
    id: "sanbi-mutavhatsindi-conservation",
    title: "Mutavhatsindi (Brackenridgea zanguebarica): Conservation Status",
    topic: "rare medicinal plant identification, conservation and propagation limits",
    cropCategory: "threatened indigenous medicinal plant",
    geographicRelevance: ["Mafukani", "Mutale", "Vhembe", "Limpopo", "South Africa"],
    language: "en",
    source: "South African National Biodiversity Institute, PlantZAfrica",
    sourceUrl: "https://plantzafrica.com/plantab/brackenzang.html",
    publicationDate: "2011-04",
    lastVerifiedAt: "2026-11-18",
    verificationStatus: "verified",
    summary: "SANBI PlantZAfrica identifies Brackenridgea zanguebarica (Mutavhatsindi) as critically endangered in South Africa, with a small population at Mafukani in Vhembe. The updated SANBI profile (October 2025) reports that propagation remains challenging, but a 2021 pilot achieved over 90% success with on-site air layering; stem cuttings had at least 30% rooting in trials, while seed germination remained very poor (1.5% in one trial). These are specialist conservation trials, not instructions for home propagation. The species remains critically endangered and wild harvesting has caused severe decline. Do not collect wild bark, roots, seed or seedlings; any propagation or recovery work must be authorised and community-led.",
    keywords: ["Mutavhatsindi", "Brackenridgea zanguebarica", "Mafukani", "Mutale", "Vhembe", "rare herb", "critically endangered", "medicinal plant", "conservation", "propagation"]
  },
  {
    id: "sanbi-buddleja-salviifolia",
    title: "Buddleja salviifolia: Growing an Indigenous Sagewood",
    topic: "indigenous plant propagation from seed and cuttings",
    cropCategory: "indigenous shrub",
    geographicRelevance: ["South Africa", "Northern South Africa", "Limpopo"],
    language: "en",
    source: "South African National Biodiversity Institute, PlantZAfrica",
    sourceUrl: "https://plantzafrica.com/plantab/buddlsalv.html",
    publicationDate: "2001-07",
    lastVerifiedAt: "2026-11-18",
    verificationStatus: "verified",
    summary: "SANBI PlantZAfrica describes Buddleja salviifolia as propagable from seed and cuttings. The profile describes hardwood cuttings rooted in washed river sand kept moist for several weeks, and fine seed raised in a fine seedling mix with careful watering from below. Protect young plants from frost during their first season. Confirm the species and adapt planting time to local conditions; traditional-use records do not establish medical safety or efficacy.",
    keywords: ["Buddleja salviifolia", "sagewood", "indigenous shrub", "traditional herb", "seed", "cuttings", "propagation", "river sand", "Limpopo"]
  },
  {
    id: "sanbi-crotalaria-natalitia",
    title: "Crotalaria natalitia: Seed Propagation and Legume Use",
    topic: "indigenous legume cultivation, seed sowing and soil fertility",
    cropCategory: "indigenous legume",
    geographicRelevance: ["Northern South Africa", "Limpopo", "Mpumalanga", "South Africa"],
    language: "en",
    source: "South African National Biodiversity Institute, PlantZAfrica",
    sourceUrl: "https://plantzafrica.com/plantcd/crotalarianatnat.html",
    publicationDate: "2012-08",
    lastVerifiedAt: "2026-11-18",
    verificationStatus: "verified",
    summary: "SANBI PlantZAfrica describes Crotalaria natalitia var. natalitia as readily propagated from seed and suited to warm conditions. The profile notes its potential use in rotations or intercropping with finger millet and maize due to its legume nitrogen-fixing capacity. Its specific sowing and spacing details apply to this species and should not be transferred to other Crotalaria species. Confirm local suitability and do not assume medicinal or livestock-feed safety.",
    keywords: ["Crotalaria natalitia", "indigenous legume", "seed sowing", "nitrogen fixation", "green manure", "finger millet", "maize", "traditional crop", "soil fertility"]
  },
 ];

const STOP_WORDS = new Set(["the", "and", "for", "with", "what", "when", "how", "should", "can", "my", "in", "to", "a", "is", "of", "on", "me", "please"]);

function terms(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/).filter((term) => term.length > 2 && !STOP_WORDS.has(term));
}

export function searchAgriculturalKnowledge(query: string, locality = "", limit = 3) {
  const queryTerms = new Set(terms(query));
  if (!queryTerms.size) return [];
  const placeTerms = new Set(terms(locality));
  return agriculturalKnowledge
    .map((document) => {
      const titleTerms = new Set(terms(document.title));
      const keywordTerms = new Set(document.keywords.flatMap(terms));
      const summaryTerms = new Set(terms(document.summary + " " + document.topic));
      let score = 0;
      for (const term of queryTerms) {
        if (titleTerms.has(term)) score += 4;
        if (keywordTerms.has(term)) score += 3;
        if (summaryTerms.has(term)) score += 1;
      }
      for (const term of placeTerms) {
        if (document.geographicRelevance.some((place) => place.toLowerCase().includes(term))) score += 2;
      }
      return { document, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ document, score }) => ({ ...document, relevanceScore: score }));
}
