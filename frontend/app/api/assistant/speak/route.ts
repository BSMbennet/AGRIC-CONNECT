import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema=z.object({
  text:z.string().trim().min(1).max(3000),
  language:z.enum(["en","ve","ts","nso","zu","xh","af","tn","st","ss","nr"])
});
const fail=(message:string,status:number)=>NextResponse.json({error:message},{status});
const windows=new Map<string,{start:number;count:number}>();
function rateLimited(userId:string){const now=Date.now(),current=windows.get(userId);if(!current||now-current.start>=60_000){windows.set(userId,{start:now,count:1});return false;}current.count+=1;return current.count>10;}

export async function POST(request:NextRequest){
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return fail("Sign in to use spoken responses.",401);
  if(rateLimited(user.id))return fail("Spoken responses are limited to ten requests per minute. Please wait and try again.",429);
  let body:unknown;
  try{body=await request.json();}catch{return fail("Invalid speech request.",400);}
  const parsed=schema.safeParse(body);
  if(!parsed.success)return fail("The speech request is invalid.",400);
  const apiKey=process.env.AI_TTS_API_KEY;
  const model=process.env.AI_TTS_MODEL;
  const base=(process.env.AI_TTS_BASE_URL||"").replace(/\/$/,"");
  const voice=process.env.AI_TTS_VOICE;
  const supported=(process.env.AI_TTS_SUPPORTED_LANGUAGES||"").split(",").map(x=>x.trim()).filter(Boolean);
  if(!apiKey||!model||!base||!voice)return fail("Spoken responses are not configured for this language. Text remains available.",501);
  if(!supported.includes(parsed.data.language))return fail("A verified speech voice is not enabled for this language. Text remains available.",501);
  try{
    const response=await fetch(base+"/audio/speech",{
      method:"POST",
      headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},
      body:JSON.stringify({model,voice,input:parsed.data.text,response_format:"mp3"}),
      signal:AbortSignal.timeout(45000),cache:"no-store"
    });
    if(!response.ok)return fail("Speech generation is unavailable. Text remains available.",502);
    const audio=await response.arrayBuffer();
    if(!audio.byteLength||audio.byteLength>15*1024*1024)return fail("The speech provider returned an invalid audio file.",502);
    return new NextResponse(audio,{status:200,headers:{"Content-Type":"audio/mpeg","Cache-Control":"no-store","Content-Length":String(audio.byteLength)}});
  }catch{return fail("Speech generation is temporarily unavailable. Text remains available.",502);}
}
