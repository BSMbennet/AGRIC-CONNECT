import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const languages = ["auto","en","ve","ts","nso","zu","xh","af","tn","st","ss","nr"] as const;
const languageSchema = z.enum(languages);

const fail=(message:string,status:number)=>NextResponse.json({error:message},{status});
const windows=new Map<string,{start:number;count:number}>();
function rateLimited(userId:string){const now=Date.now(),current=windows.get(userId);if(!current||now-current.start>=60_000){windows.set(userId,{start:now,count:1});return false;}current.count+=1;return current.count>5;}

export async function POST(request:NextRequest){
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return fail("Sign in to use voice input.",401);
  if(rateLimited(user.id))return fail("Voice transcription is limited to five recordings per minute. Please wait and try again.",429);
  const contentLength=Number(request.headers.get("content-length")||0);
  if(contentLength>13*1024*1024)return fail("Audio must be smaller than 12 MB.",413);

  const apiKey=process.env.AI_SPEECH_API_KEY;
  const model=process.env.AI_SPEECH_MODEL;
  const base=(process.env.AI_SPEECH_BASE_URL||"").replace(/\/$/,"");
  const supported=(process.env.AI_SPEECH_SUPPORTED_LANGUAGES||"").split(",").map(x=>x.trim()).filter(Boolean);
  if(!apiKey||!model||!base)return fail("Voice transcription is not configured. Please type your message.",501);

  let form:FormData;
  try{form=await request.formData();}catch{return fail("Could not read the audio recording.",400);}
  const parsed=languageSchema.safeParse(form.get("language"));
  const audio=form.get("audio");
  if(!parsed.success||!(audio instanceof File))return fail("Choose a language and record your question again.",400);
  if(parsed.data==="auto"&&!supported.length)return fail("Voice transcription is not enabled for any configured language. Please type your message.",501);\n  if(parsed.data!=="auto"&&!supported.includes(parsed.data))return fail("Voice transcription has not been verified for this language. Please type your message.",501);
  if(audio.size<1||audio.size>12*1024*1024)return fail("Audio must be smaller than 12 MB.",413);
  if(!["audio/webm","audio/webm;codecs=opus","audio/ogg","audio/mp4","audio/mpeg","audio/wav"].some(type=>audio.type.startsWith(type)))return fail("This audio format is not supported. Please try a different browser.",415);

  const outgoing=new FormData();
  outgoing.append("file",audio,audio.name||"agric-ai-recording.webm");
  outgoing.append("model",model);
  if(parsed.data!=="auto")outgoing.append("language",parsed.data);
  try{
    const response=await fetch(base+"/audio/transcriptions",{
      method:"POST",headers:{Authorization:"Bearer "+apiKey},body:outgoing,
      signal:AbortSignal.timeout(45000),cache:"no-store"
    });
    if(!response.ok)return fail("The speech provider could not transcribe this recording. Please type your message.",502);
    const payload=await response.json() as {text?:string};
    const text=payload.text?.trim();
    if(!text)return fail("No speech was detected. Please try again or type your message.",422);
    return NextResponse.json({text,language:parsed.data==="auto"?null:parsed.data,provider:"configured-speech-provider"});
  }catch{return fail("Voice transcription is temporarily unavailable. Please type your message.",502);}
}
