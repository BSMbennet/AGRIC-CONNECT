"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Leaf, Send, X } from "lucide-react";

type Msg = { role: "user" | "assistant"; text: string; note?: string };
const LANGS = { en: "English", ve: "Tshivenda", ts: "Xitsonga", nso: "Sepedi" } as const;
type Lang = keyof typeof LANGS;
const SUGGESTIONS = ["How do I add a product?", "Where can I see my orders?", "How do I record an expense?", "How much profit did I make this month?"];

/** Renders text with line breaks and ONLY internal markdown links as real links. */
function Rich({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /\[([^\]\n]{1,80})\]\((\/[A-Za-z0-9/_\-?=&]{0,150})\)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<Link key={i++} href={m[2]} className="font-semibold text-leaf underline">{m[1]}</Link>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span className="whitespace-pre-wrap break-words">{parts}</span>;
}

export function AssistantWidget() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { try { const l = localStorage.getItem("agric_ai_lang"); if (l && l in LANGS) setLang(l as Lang); } catch { /* storage unavailable */ } }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); }, [msgs, busy, reduce]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setMsgs((m) => [...m, { role: "user", text: q }]); setInput(""); setBusy(true);
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: q, conversationId: convId, language: lang, currentPath: window.location.pathname }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMsgs((m) => [...m, { role: "assistant", text: data.error ?? "Something went wrong. Please try again.", note: "error" }]);
      else { setConvId(data.conversationId); setMsgs((m) => [...m, { role: "assistant", text: data.reply, note: data.degraded ? "basic" : undefined }]); }
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "No connection right now. Your question was not sent. Please try again when you are online.", note: "error" }]);
    } finally { setBusy(false); }
  }, [busy, convId, lang]);

  return (
    <div className="print:hidden">
      <AnimatePresence>
        {open && (
          <motion.section role="dialog" aria-label="AgricNorthX AI farming assistant"
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduce ? undefined : { opacity: 0, y: 24, scale: 0.97 }} transition={{ duration: 0.2 }}
            className="fixed inset-x-3 bottom-20 z-50 flex max-h-[75vh] flex-col overflow-hidden rounded-2xl border border-emerald-900/15 bg-white shadow-2xl sm:inset-x-auto sm:right-5 sm:w-[390px]">
            <header className="flex items-center justify-between bg-forest px-4 py-3 text-white">
              <div><p className="text-sm font-bold">AgricNorthX AI</p><p className="text-xs text-emerald-100">Your farming assistant</p></div>
              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor="ai-lang">Language</label>
                <select id="ai-lang" value={lang} onChange={(e) => { const l = e.target.value as Lang; setLang(l); try { localStorage.setItem("agric_ai_lang", l); } catch { /* ignore */ } }} className="h-9 rounded-lg bg-white/15 px-2 text-xs text-white">
                  {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k} className="text-slate-900">{v}</option>)}
                </select>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/15"><X size={18} /></button>
              </div>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto bg-[#f7faf7] p-4" aria-live="polite">
              {msgs.length === 0 && (
                <div>
                  <p className="text-sm text-slate-700">Hello! Ask me about farming, selling, or how to use AgricNorthX.</p>
                  <div className="mt-3 flex flex-wrap gap-2">{SUGGESTIONS.map((s) => <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-forest/30 bg-white px-3 py-2 text-left text-xs font-semibold text-forest hover:bg-emerald-50">{s}</button>)}</div>
                  <p className="mt-3 text-xs text-slate-500">Answers are AI-generated and can be wrong. Local-language answers have not yet been checked by native speakers.</p>
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-forest text-white" : m.note === "error" ? "bg-red-50 text-red-800" : "bg-white text-slate-800 shadow-sm"}`}>
                    {m.role === "user" ? <span className="whitespace-pre-wrap break-words">{m.text}</span> : <Rich text={m.text} />}
                    {m.role === "assistant" && m.note === "basic" && <p className="mt-1 text-[11px] text-slate-500">Basic mode</p>}
                  </div>
                </div>
              ))}
              {busy && <div className="flex justify-start" role="status" aria-label="Assistant is typing"><div className="flex gap-1 rounded-2xl bg-white px-4 py-3 shadow-sm">{[0, 1, 2].map((d) => <motion.i key={d} className="h-2 w-2 rounded-full bg-leaf" animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: d * 0.15 }} />)}</div></div>}
              <div ref={endRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex items-end gap-2 border-t border-slate-200 bg-white p-3">
              <label htmlFor="ai-input" className="sr-only">Your question</label>
              <textarea id="ai-input" ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} maxLength={1500} rows={1}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
                placeholder="Type your question…" className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-base" />
              <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest text-white disabled:opacity-40"><Send size={18} /></button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
      <motion.button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? "Close AgricNorthX AI" : "Open AgricNorthX AI farming assistant"}
        whileHover={reduce ? undefined : { scale: 1.06 }} whileTap={reduce ? undefined : { scale: 0.94 }}
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-forest text-white shadow-xl ring-2 ring-gold sm:bottom-5 sm:right-5">
        {open ? <X size={24} /> : <Leaf size={26} />}
      </motion.button>
    </div>
  );
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Bot, ChevronDown, Loader2, MessageCircle, Mic, MicOff, Send, Volume2, VolumeX, Trash2, Minus, Square, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updatePreferredLanguage } from "@/actions/preferences";

const languages = [
  ["auto","Auto-detect","en-ZA"],["en","English","en-ZA"],["ve","Tshivenda","ve-ZA"],["ts","itsonga","ts-ZA"],["nso","Sepedi","nso-ZA"],
  ["zu","isiZulu","zu-ZA"],["xh","isiXhosa","xh-ZA"],["af","Afrikaans","af-ZA"],["tn","Setswana","tn-ZA"],
  ["st","Sesotho","st-ZA"],["ss","siSwati","ss-ZA"],["nr","isiNdebele","nr-ZA"]
] as const;
type Lang = typeof languages[number][0];
type SupportedLang = Exclude<Lang,"auto">;
type Msg = {role:"user"|"assistant";content:string;sources?:{title:string;url:string;publicationDate:string}[]};
const words:Record<SupportedLang,string[]> = {
en:["Agric Assistant","Your farm and marketplace helper","Hello! Ask me about your own orders, sales, listings or farming questions.","Ask about your orders, sales or crops…","Send","Listening…","Voice input","Read aloud","Sign in to use your private farm assistant.","I couldn't send that. Please try again.","Voice input is unavailable in this browser.","Your device has no installed voice for this language.","Thinking…","Language"],
ve:["Muthusi wa zwa Vhulimi","Muthusi wa bulasi na maraga","Ndaa! Vhudzisani nga ha doda, thengiso, zwibveledzwa kana vhulimi.","Vhudzisani nga ha doda kana zwimela…","Rumelani","Ndi khou thetshelesa…","U amba","Vhalani","Dzhena uri ni shumise muthusi waṋu.","A thi ngo kona u rumela. Lingedzani hafhu.","U shumisa ipfi a zwi tikedzwi kha browser iyi.","A huna ipfi ḽa luambo ulu kha tshishumiswa tshaṋu.","Ndi khou humbula…","Luambo"],
ts:["Mupfuneti wa Vurimi","Mupfuneti wa purasi na makete","Avuxeni! Vutisa hi tioda, ku xavisa, swibyariwa kumbe vurimi.","Vutisa hi tioda kumbe swimilani…","Rhumela","Ndza yingisela…","Nghenisa hi rito","Hlaya hi rito","Nghena ku tirhisa mupfuneti wa wena.","A swi kotekanga ku rhumela. Ringeta nakambe.","Ku nghenisa hi rito a swi seketeriwi eka browser leyi.","Xitirhisiwa xa wena a xi na rito ra ririmi leri.","Ndza ehleketa…","Ririmi"],
nso:["Mothuši wa Temo","Mothuši wa polase le mmaraka","Thobela! Botšiša ka diotara, thekišo, ditšweletšwa goba temo.","Botšiša ka diotara goba dibjalo…","Romela","Ke a theeletša…","Šomiša lentšu","Bala ka lentšu","Tsena go šomiša mothuši wa gago.","Ga se ka kgona go romela. Leka gape.","Go bolela ga go thekgwe go browser ye.","Sedirišwa sa gago ga se na lentšu la polelo ye.","Ke a nagana…","Polelo"],
zu:["Umsizi Wezolimo","Umsizi wepulazi nemakethe","Sawubona! Buza ngama-oda, ukuthengisa, imikhiqizo noma ukulima.","Buza ngama-oda noma izitshalo…","Thumela","Ngilalele…","Faka ngezwi","Funda ngezwi","Ngena ukuze usebenzise umsizi wakho.","Angikwazanga ukuthumela. Zama futhi.","Ukufaka ngezwi akutholakali kulesi siphequluli.","Idivayisi yakho ayinalo izwi lalolu limi.","Ngiyacabanga…","Ulimi"],
xh:["Umncedisi Wezolimo","Umncedisi wefama nemarike","Molo! Buza ngee-odolo, intengiso, iimveliso okanye ezolimo.","Buza ngee-odolo okanye izityalo…","Thumela","Ndiphulaphule…","Faka ngelizwi","Funda ngelizwi","Ngena ukuze usebenzise umncedisi wakho.","Andikwazanga ukuthumela. Zama kwakhona.","Ukufaka ngelizwi akufumaneki kwesi sikhangeli.","Isixhobo sakho asinazwi lolu lwimi.","Ndiyacinga…","Ulwimi"],
af:["Landbou-assistent","Jou plaas- en markhelper","Hallo! Vra oor jou bestellings, verkope, aanbiedings of boerdery.","Vra oor bestellings of gewasse…","Stuur","Ek luister…","Stem invoer","Lees hardop","Meld aan om jou private assistent te gebruik.","Ek kon dit nie stuur nie. Probeer weer.","Stem invoer is nie in hierdie blaaier beskikbaar nie.","Jou toestel het nie 'n stem vir hierdie taal nie.","Dink…","Taal"],
tn:["Mothusi wa Temothuo","Mothusi wa polase le mmaraka","Dumela! Botsa ka diotara, thekiso, ditlhagiswa kgotsa temo.","Botsa ka diotara kgotsa dijalo…","Romela","Ke a reetsa…","Dirisa lentswe","Buisa ka lentswe","Tsena go dirisa mothusi wa gago.","Ga ke a kgona go romela. Leka gape.","Go tsenya ka lentswe ga go teng mo browser eno.","Sediriswa sa gago ga se na lentswe la puo eno.","Ke a akanya…","Puo"],
st:["Mothusi oa Temo","Mothusi oa polasi le 'maraka","Lumela! Botsa ka liodara, thekiso, lihlahisoa kapa temo.","Botsa ka liodara kapa lijalo…","Romela","Ke mametse…","Kenya ka lentsoe","Bala ka lentsoe","Kena ho sebelisa mothusi oa hao.","Ha kea khona ho romela. Leka hape.","Ho kenya ka lentsoe ha ho fumanehe ho sebatli sena.","Sesebelisoa sa hao ha se na lentsoe la puo ena.","Ke nahana…","Puo"],
ss:["Umsiti Wetekulima","Umsiti welipulazi nemakethe","Sawubona! Buta ngema-oda, kutsengisa, imikhicito noma kulima.","Buta ngema-oda noma titjalo…","Tfumela","Ngilalele…","Faka ngelivi","Fundza ngelivi","Ngena kusebentisa umsiti wakho.","Angikhonanga kutfumela. Zama futsi.","Kufaka ngelivi akusekelwa kulesi siphequluli.","Idivayisi yakho ayinalo livi lalolu limi.","Ngiyacabanga…","Lulwimi"],
nr:["Umsizi Wezolimo","Umsizi wepulazi nemakethe","Lotjha! Buza ngama-oda, ukuthengisa, imikhiqizo namkha ukulima.","Buza ngama-oda namkha iintjalo…","Thumela","Ngilalele…","Faka ngelizwi","Funda ngelizwi","Ngena ukusebenzisa umsizi wakho.","Angikwazanga ukuthumela. Zama godu.","Ukufaka ngelizwi akutholakali kulesi siphequluli.","Idivayisi yakho ayinalo ilizwi lalolu limi.","Ngiyacabanga…","Ilimi"]
};
export function AssistantWidget({initialLanguage="en"}:{initialLanguage?:string}) {
 const router=useRouter();
 const [lang,setLang]=useState<Lang>(initialLanguage==="tsh"?"ve":languages.some(x=>x[0]===initialLanguage)?initialLanguage as Lang:"en");
 const [signedIn,setSignedIn]=useState<boolean|null>(null),[open,setOpen]=useState(false),[messages,setMessages]=useState<Msg[]>([]);
 const [draft,setDraft]=useState(""),[busy,setBusy]=useState(false),[listening,setListening]=useState(false),[notice,setNotice]=useState(""),[speaking,setSpeaking]=useState(false),[speechPaused,setSpeechPaused]=useState(false);
 const [memoryEnabled,setMemoryEnabled]=useState(false),[memoryReady,setMemoryReady]=useState(false),[autoVoice,setAutoVoice]=useState(false);
 const recorder=useRef<MediaRecorder|null>(null),audioPlayback=useRef<HTMLAudioElement|null>(null),t=words[lang==="auto"?"en":lang],locale=useMemo(()=>languages.find(x=>x[0]===lang)?.[2]??"en-ZA",[lang]);
 useEffect(()=>{const next=initialLanguage==="tsh"?"ve":languages.some(x=>x[0]===initialLanguage)?initialLanguage as Lang:"en";setLang(next);},[initialLanguage]);
 useEffect(()=>{let alive=true;createClient().auth.getUser().then(({data})=>{if(alive)setSignedIn(Boolean(data.user));}).catch(()=>{if(alive)setSignedIn(false);});return()=>{alive=false;recorder.current?.stop();audioPlayback.current?.pause();if("speechSynthesis"in window)window.speechSynthesis.cancel();};},[]);
 useEffect(()=>{if(signedIn!==true)return;let alive=true;fetch("/api/assistant/memory",{cache:"no-store"}).then(async response=>{if(!response.ok)throw new Error("Memory settings unavailable");return response.json() as Promise<{enabled?:boolean;messages?:Msg[]}>;}).then(data=>{if(!alive)return;setMemoryEnabled(data.enabled===true);if(data.enabled&&data.messages?.length)setMessages(data.messages.map(m=>({role:m.role,content:m.content})));setMemoryReady(true);}).catch(()=>{if(alive)setMemoryReady(true);});return()=>{alive=false;};},[signedIn]);
 useEffect(()=>{if(open&&!messages.length)setMessages([{role:"assistant",content:t[2]}]);},[open,messages.length,t]);
 async function setLanguage(value:string){if(!languages.some(x=>x[0]===value))return;setLang(value as Lang);setNotice("");if(value!=="auto"){await updatePreferredLanguage(value);router.refresh();}}
 async function submit(e?:FormEvent){e?.preventDefault();const message=draft.trim();if(!message||busy)return;const history=[...messages,{role:"user" as const,content:message}];setMessages(history);setDraft("");setBusy(true);try{const r=await fetch("/api/assistant",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message,language:lang,history:messages.slice(-8)})});const data=await r.json() as {reply?:string;error?:string;detectedLanguage?:Lang|null;sources?:{title:string;url:string;publicationDate:string}[]};if(!r.ok)throw new Error(data.error);if(lang==="auto"&&data.detectedLanguage)setLang(data.detectedLanguage);setMessages(current=>[...current,{role:"assistant",content:data.reply??t[2],sources:data.sources??[]}]);if(autoVoice&&data.reply)void speak(data.reply,(data.detectedLanguage&&data.detectedLanguage!=="auto"?data.detectedLanguage:lang==="auto"?"en":lang) as SupportedLang);}catch(error){const message=error instanceof Error?error.message:t[9];setMessages(current=>[...current,{role:"assistant",content:message}]);}finally{setBusy(false);}}
 async function voice(){
  if(listening){recorder.current?.stop();return;}
  
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){setNotice(t[10]);return;}
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});
   const mime=MediaRecorder.isTypeSupported("audio/webm;codecs=opus")?"audio/webm;codecs=opus":undefined;
   const rec=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);
   const chunks:Blob[]=[];
   rec.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
   rec.onerror=()=>{stream.getTracks().forEach(track=>track.stop());setListening(false);setNotice("Recording failed. Please type your question.");};
   rec.onstop=async()=>{
    stream.getTracks().forEach(track=>track.stop());setListening(false);
    const blob=new Blob(chunks,{type:rec.mimeType||"audio/webm"});
    if(!blob.size){setNotice("No audio was recorded. Please try again.");return;}
    const form=new FormData();form.append("audio",blob,"agric-ai-recording.webm");form.append("language",lang);
    try{
     const response=await fetch("/api/assistant/transcribe",{method:"POST",body:form});
     const data=await response.json() as {text?:string;error?:string};
     if(!response.ok||!data.text)throw new Error(data.error||"Speech transcription is unavailable.");
     setDraft(current=>current?current+" "+data.text:data.text!);
     setNotice("Transcription added to the message box. Review and correct it before sending.");
    }catch(error){setNotice(error instanceof Error?error.message:"Voice transcription is unavailable. Please type your question.");}
   };
   recorder.current=rec;setListening(true);setNotice("");rec.start();
  }catch{setListening(false);setNotice("Microphone permission was denied or recording is unavailable. You can type your question instead.");}
 }
 function stopSpeaking(){
  if("speechSynthesis"in window)window.speechSynthesis.cancel();
  if(audioPlayback.current){audioPlayback.current.pause();if(audioPlayback.current.src.startsWith("blob:"))URL.revokeObjectURL(audioPlayback.current.src);audioPlayback.current=null;}
  setSpeaking(false);setSpeechPaused(false);
 }
 async function speak(text:string,languageOverride?:SupportedLang){
  stopSpeaking();
  try{
   const response=await fetch("/api/assistant/speak",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text,language:languageOverride??(lang==="auto"?"en":lang)})});
   if(response.ok){
    const url=URL.createObjectURL(await response.blob());const audio=new Audio(url);audioPlayback.current=audio;
    audio.onplay=()=>{setSpeaking(true);setSpeechPaused(false);};
    audio.onended=()=>{URL.revokeObjectURL(url);audioPlayback.current=null;setSpeaking(false);setSpeechPaused(false);};
    audio.onerror=()=>{URL.revokeObjectURL(url);audioPlayback.current=null;setSpeaking(false);setSpeechPaused(false);setNotice(t[11]);};
    await audio.play();return;
   }
  }catch{/* Use an installed browser voice as a best-effort fallback. */}
  if(!("speechSynthesis"in window)){setNotice(t[11]);return;}
  const prefix=locale.split("-")[0].toLowerCase();
  const v=window.speechSynthesis.getVoices().find(x=>x.lang.toLowerCase().startsWith(prefix));
  if(!v){setNotice("No configured hosted voice or matching browser voice is available for this language. Text remains available.");return;}
  const utterance=new SpeechSynthesisUtterance(text);utterance.voice=v;utterance.lang=v.lang;
  utterance.onstart=()=>{setSpeaking(true);setSpeechPaused(false);};
  utterance.onend=()=>{setSpeaking(false);setSpeechPaused(false);};
  utterance.onerror=()=>{setSpeaking(false);setSpeechPaused(false);};
  window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);
 }
 function toggleSpeechPause(){
  if(audioPlayback.current){if(speechPaused){void audioPlayback.current.play();setSpeechPaused(false);}else{audioPlayback.current.pause();setSpeechPaused(true);}return;}
  if(!("speechSynthesis"in window))return;
  if(speechPaused){window.speechSynthesis.resume();setSpeechPaused(false);}else{window.speechSynthesis.pause();setSpeechPaused(true);}
 }
 async function clearConversation(){stopSpeaking();if(memoryEnabled){try{const response=await fetch("/api/assistant/memory",{method:"DELETE"});if(!response.ok)throw new Error("delete failed");}catch{setNotice("Saved conversation could not be deleted. Please try again.");return;}}setMessages([{role:"assistant",content:t[2]}]);setDraft("");setNotice("");}
 async function toggleMemory(){const enabled=!memoryEnabled;try{const response=await fetch("/api/assistant/memory",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({enabled})});if(!response.ok)throw new Error("preference update failed");setMemoryEnabled(enabled);if(!enabled)setMessages([{role:"assistant",content:t[2]}]);setNotice(enabled?"Conversation memory is on. Your messages are saved to your account until you clear or disable memory.":"Conversation memory is off and saved assistant messages have been deleted.");}catch{setNotice("Memory settings are unavailable until the AGRIC AI database migration is applied.");}}
 return <div id="assistant" className="fixed bottom-4 right-4 z-[70] sm:bottom-6 sm:right-6">
 {open&&<section aria-label={t[0]} className="mb-3 flex h-[min(620px,78vh)] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-emerald-900/15 bg-white shadow-2xl">
 <header className="flex items-center justify-between bg-forest px-4 py-4 text-white"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15"><Bot size={22}/></span><div><h2 className="font-bold">{t[0]}</h2><p className="text-xs text-emerald-100">{t[1]}</p></div></div><div className="flex items-center gap-1"><button type="button" onClick={()=>setAutoVoice(v=>!v)} aria-label={autoVoice?"Turn off spoken replies":"Turn on spoken replies"} title={autoVoice?"Spoken replies on":"Spoken replies off"} className={autoVoice?"rounded-full bg-white/20 p-2":"rounded-full p-2 hover:bg-white/15"}><Volume2 size={17}/></button><button type="button" onClick={clearConversation} aria-label="Clear conversation" title="Clear conversation" className="rounded-full p-2 hover:bg-white/15"><Trash2 size={17}/></button>{speaking&&<><button type="button" onClick={toggleSpeechPause} aria-label={speechPaused?"Resume speech":"Pause speech"} title={speechPaused?"Resume speech":"Pause speech"} className="rounded-full p-2 hover:bg-white/15">{speechPaused?<Volume2 size={17}/>:<VolumeX size={17}/>}</button><button type="button" onClick={stopSpeaking} aria-label="Stop speaking" title="Stop speaking" className="rounded-full p-2 hover:bg-white/15"><Square size={15}/></button></>}<button type="button" onClick={()=>setOpen(false)} aria-label="Minimize assistant" title="Minimize" className="rounded-full p-2 hover:bg-white/15"><Minus size={18}/></button><button type="button" onClick={()=>{stopSpeaking();setOpen(false);}} aria-label="Close assistant" title="Close" className="rounded-full p-2 hover:bg-white/15"><X size={19}/></button></div></header>
 <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5"><label className="flex min-w-0 items-center gap-2 text-xs text-slate-500">{t[13]}<span className="relative"><select value={lang} onChange={e=>void setLanguage(e.target.value)} className="max-w-[150px] appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-2 pr-7 text-xs font-semibold text-forest">{languages.map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select><ChevronDown size={13} className="pointer-events-none absolute right-2 top-2"/></span></label><button type="button" onClick={()=>void toggleMemory()} disabled={!memoryReady} aria-pressed={memoryEnabled} className="shrink-0 rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-semibold text-slate-600 disabled:opacity-40">{memoryEnabled?"Memory on":"Memory off"}</button></div>
 <div className="flex-1 space-y-3 overflow-y-auto bg-[#f8faf8] p-4" aria-live="polite">{messages.map((m,i)=><div key={i} className={m.role==="user"?"ml-8 rounded-2xl rounded-br-md bg-forest px-3.5 py-3 text-sm leading-6 text-white":"mr-5 rounded-2xl rounded-bl-md border border-emerald-900/10 bg-white px-3.5 py-3 text-sm leading-6 text-slate-700"}><p className="whitespace-pre-wrap">{m.content}</p>{m.role==="assistant"&&m.sources&&m.sources.length>0&&<ul className="mt-2 space-y-1 border-t border-slate-100 pt-2">{m.sources.map(source=><li key={source.url} className="text-xs"><a href={source.url} target="_blank" rel="noreferrer" className="font-medium text-leaf underline underline-offset-2">{source.title}</a><span className="ml-1 text-slate-400">({source.publicationDate})</span></li>)}</ul>}{m.role==="assistant"&&i>0&&<button onClick={()=>speak(m.content)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-leaf"><Volume2 size={14}/>{t[7]}</button>}</div>)}{busy&&<div className="flex items-center gap-2 rounded-xl bg-white p-3 text-xs text-slate-500"><Loader2 size={15} className="animate-spin"/>{t[12]}</div>}</div>
 {notice&&<p role="status" className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-900">{notice}</p>}
 <form onSubmit={submit} className="border-t border-slate-100 bg-white p-3"><div className="flex items-end gap-2"><button type="button" onClick={()=>{if(listening){recorder.current?.stop();}else void voice();}} aria-label={t[6]} className={listening?"grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600":"grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-leaf"}>{listening?<MicOff size={19}/>:<Mic size={19}/>}</button><textarea value={draft} onChange={e=>setDraft(e.target.value)} placeholder={listening?t[5]:t[3]} rows={2} maxLength={2000} className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-leaf"/><button type="submit" disabled={busy||!draft.trim()} aria-label={t[4]} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-forest text-white disabled:opacity-40"><Send size={18}/></button></div></form>
 </section>}
 <button onClick={()=>setOpen(v=>!v)} aria-expanded={open} className="ml-auto flex h-14 items-center gap-2 rounded-full bg-forest px-5 text-sm font-bold text-white shadow-xl hover:bg-leaf">{open?<X size={20}/>:<MessageCircle size={21}/>}<span>{t[0]}</span></button>
 </div>;
}
