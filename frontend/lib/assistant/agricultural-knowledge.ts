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
  }
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
