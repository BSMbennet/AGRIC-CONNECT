import type { AgriculturalKnowledgeDocument } from "./agricultural-knowledge";

type FullTextRow = {
  id:string;
  heading:string|null;
  content:string;
  locality_tags:string[];
  crop_tags:string[];
  source:{
    title:string;
    publisher:string;
    source_url:string;
    published_on:string|null;
    language:string;
    status:string;
  };
};
type KnowledgeDbClient = {
  from:(table:"agri_knowledge_chunks")=>({
    select:(columns:string)=>({
      textSearch:(column:"search_document",query:string,options:{config:"simple";type:"websearch"})=>({
        limit:(count:number)=>Promise<{data:FullTextRow[]|null;error:unknown}>
      })
    })
  });
  rpc:(name:"match_agri_knowledge_chunks",args:{
    query_embedding:number[];
    match_count:number;
    locality_filter:string|null;
    crop_filter:null;
  })=>Promise<{data:Array<{
    chunk_id:string;
    title:string;
    heading:string|null;
    crop_tags:string[];
    locality_tags:string[];
    publisher:string;
    source_url:string;
    published_on:string|null;
    content:string;
    similarity:number;
  }>|null;error:unknown}>;
};

async function searchApprovedFullText(client:KnowledgeDbClient,query:string,limit:number):Promise<AgriculturalKnowledgeDocument[]>{
  const {data,error}=await client.from("agri_knowledge_chunks")
    .select("id,heading,content,locality_tags,crop_tags,source:agri_knowledge_sources!inner(title,publisher,source_url,published_on,language,status)")
    .textSearch("search_document",query,{config:"simple",type:"websearch"})
    .limit(Math.max(1,Math.min(limit,8)));
  if(error||!data?.length)return [];
  return data.map(row=>({
    id:"fts-"+row.id,
    title:row.source.title,
    topic:row.heading??"Agricultural production guidance",
    cropCategory:row.crop_tags?.join(", ")||"general agriculture",
    geographicRelevance:row.locality_tags??[],
    language:"en",
    source:row.source.publisher,
    sourceUrl:row.source.source_url,
    publicationDate:row.source.published_on??"Not stated",
    lastVerifiedAt:"Approved in the AGRIC-CONNECT knowledge base",
    verificationStatus:"verified",
    summary:row.content,
    keywords:row.crop_tags??[],
    relevanceScore:0
  }));
}

export async function searchVectorAgriculturalKnowledge(
  supabase: unknown,
  query: string,
  locality = "",
  limit = 4
): Promise<AgriculturalKnowledgeDocument[]> {
  const client=supabase as KnowledgeDbClient;
  if(!query.trim())return [];
  const apiKey=process.env.AI_EMBEDDING_API_KEY;
  const model=process.env.AI_EMBEDDING_MODEL;
  if(!apiKey||!model)return searchApprovedFullText(client,query,limit);
  const base=(process.env.AI_EMBEDDING_BASE_URL||"https://integrate.api.nvidia.com/v1").replace(/\/$/,"");
  const response=await fetch(base+"/embeddings",{
    method:"POST",
    headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},
    body:JSON.stringify({model,input:query}),
    signal:AbortSignal.timeout(12000),
    cache:"no-store"
  });
  if(!response.ok)throw new Error("Embedding provider unavailable");
  const payload=await response.json() as {data?:Array<{embedding?:number[]}>};
  const embedding=payload.data?.[0]?.embedding;
  if(!embedding||embedding.length!==1024||embedding.some(value=>!Number.isFinite(value)))return searchApprovedFullText(client,query,limit);
  const localityTag=locality.split(",").at(-1)?.trim()||null;
  const {data,error}=await client.rpc("match_agri_knowledge_chunks",{
    query_embedding:embedding,match_count:Math.max(1,Math.min(limit,8)),
    locality_filter:localityTag,crop_filter:null
  });
  if(error||!data?.length)return searchApprovedFullText(client,query,limit);
  return data.map(match=>({
    id:"db-"+match.chunk_id,
    title:match.title,
    topic:match.heading??"Agricultural production guidance",
    cropCategory:match.crop_tags?.join(", ")||"general agriculture",
    geographicRelevance:match.locality_tags??[],
    language:"en",
    source:match.publisher,
    sourceUrl:match.source_url,
    publicationDate:match.published_on??"Not stated",
    lastVerifiedAt:"Approved in the AGRIC-CONNECT knowledge base",
    verificationStatus:"verified",
    summary:match.content,
    keywords:match.crop_tags??[],
    relevanceScore:match.similarity
  }));
}
