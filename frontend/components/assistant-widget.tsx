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
}
