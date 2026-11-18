import type { AgriculturalKnowledgeDocument } from "./agricultural-knowledge";

type VectorMatch = {
  chunk_id:string;
  title:string;
  publisher:string;
  source_url:string;
  published_on:string|null;
  language:string;
  heading:string|null;
  content:string;
  locality_tags:string[];
  crop_tags:string[];
  similarity:number;
};

export async function searchVectorAgriculturalKnowledge(
  supabase: unknown,
  query: string,
  locality = "",
  limit = 4
): Promise<AgriculturalKnowledgeDocument[]> {
  const apiKey=process.env.AI_EMBEDDING_API_KEY;
  const model=process.env.AI_EMBEDDING_MODEL;
  if(!apiKey||!model||!query.trim())return [];
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
  if(!embedding||embedding.length!==1024||embedding.some(value=>!Number.isFinite(value)))return [];
  const client=supabase as {rpc:(name:string,args:Record<string,unknown>)=>Promise<{data:VectorMatch[]|null;error?:unknown}>};
  const localityTag=locality.split(",")[0]?.trim()||null;
  const {data,error}=await client.rpc("match_agri_knowledge_chunks",{
    query_embedding:embedding,match_count:Math.max(1,Math.min(limit,8)),
    locality_filter:localityTag,crop_filter:null
  });
  if(error||!data?.length)return [];
  return data.map((match,index)=>({
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
