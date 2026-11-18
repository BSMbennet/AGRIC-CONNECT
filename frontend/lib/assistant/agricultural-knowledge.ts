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
