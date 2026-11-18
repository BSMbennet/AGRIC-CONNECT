import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const languages = ["en","ve","ts","nso","zu","xh","af","tn","st","ss","nr"] as const;
const languageSchema = z.enum(languages);

const fail=(message:string,status:number)=>NextResponse.json({error:message},{status});

export async function POST(request:NextRequest){
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return fail("Sign in to use voice input.",401);

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
  if(!supported.includes(parsed.data))return fail("Voice transcription has not been verified for this language. Please type your message.",501);
  if(audio.size<1||audio.size>12*1024*1024)return fail("Audio must be smaller than 12 MB.",413);
  if(!["audio/webm","audio/webm;codecs=opus","audio/ogg","audio/mp4","audio/mpeg","audio/wav"].some(type=>audio.type.startsWith(type)))return fail("This audio format is not supported. Please try a different browser.",415);

  const outgoing=new FormData();
  outgoing.append("file",audio,audio.name||"agric-ai-recording.webm");
  outgoing.append("model",model);
  outgoing.append("language",parsed.data);
  try{
    const response=await fetch(base+"/audio/transcriptions",{
      method:"POST",headers:{Authorization:"Bearer "+apiKey},body:outgoing,
      signal:AbortSignal.timeout(45000),cache:"no-store"
    });
    if(!response.ok)return fail("The speech provider could not transcribe this recording. Please type your message.",502);
    const payload=await response.json() as {text?:string};
    const text=payload.text?.trim();
    if(!text)return fail("No speech was detected. Please try again or type your message.",422);
    return NextResponse.json({text,language:parsed.data,provider:"configured-speech-provider"});
  }catch{return fail("Voice transcription is temporarily unavailable. Please type your message.",502);}
}
