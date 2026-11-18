"use client";

import { FormEvent, useState } from "react";
import { Send, Sprout, Loader2, BookOpen, ShieldCheck, MicOff } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };
type Source = { id: number; title: string; publisher: string; url: string; heading: string | null; locality: string[]; crops: string[] };

const languages = [
  { value: "en", label: "English" },
  { value: "ve", label: "Tshivenda · experimental" },
  { value: "ts", label: "Xitsonga · experimental" },
  { value: "nso", label: "Sepedi · experimental" },
] as const;

export function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState<"en" | "ve" | "ts" | "nso">("en");
  const [sources, setSources] = useState<Source[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-10), language }),
      });
      const payload = await response.json() as { answer?: string; error?: string; sources?: Source[]; languageNotice?: string | null };
      if (!response.ok) throw new Error(payload.error || "The assistant could not answer.");
      setMessages([...next, { role: "assistant", content: payload.answer || "" }]);
      setSources(payload.sources || []);
      setNotice(payload.languageNotice || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-emerald-50 p-2 text-forest"><Sprout size={21}/></span>
            <div><h2 className="font-bold text-forest">Ask AgricNorthX</h2><p className="text-xs text-slate-500">Marketplace records + cited agricultural guidance</p></div>
          </div>
          <label className="text-xs font-semibold text-slate-600">Reply language
            <select value={language} onChange={(e) => setLanguage(e.target.value as typeof language)} className="ml-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm">
              {languages.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
        </div>
        <div aria-live="polite" className="min-h-[360px] space-y-4 bg-[#fbfdfb] p-5">
          {!messages.length && <div className="mx-auto max-w-xl py-12 text-center">
            <Sprout className="mx-auto text-leaf" size={32}/>
            <h3 className="mt-4 text-lg font-bold text-forest">Your farm and marketplace assistant</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Ask about your own listings, orders, fulfilled sales, delivery schedules, subscription limits or bookkeeping. You can also ask a crop question and receive source links when an approved local guide matches.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {["How many active listings do I have?","What is my fulfilled sales value?","How should I manage tomato fruit set?"].map((prompt) => <button type="button" key={prompt} onClick={() => setInput(prompt)} className="rounded-full border border-emerald-900/15 bg-white px-3 py-2 text-xs font-semibold text-forest hover:bg-emerald-50">{prompt}</button>)}
            </div>
          </div>}
          {messages.map((message, index) => <div key={index} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={message.role === "user" ? "max-w-[88%] rounded-2xl rounded-br-md bg-forest px-4 py-3 text-sm leading-6 text-white" : "max-w-[92%] rounded-2xl rounded-bl-md border border-emerald-900/10 bg-white px-4 py-3 text-sm leading-6 text-slate-700"}>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>)}
          {busy && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin" size={16}/> Checking your records and trusted sources…</div>}
          {error && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
          {notice && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{notice}</p>}
        </div>
        <form onSubmit={send} className="flex items-end gap-2 border-t border-slate-100 bg-white p-4">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} rows={2} maxLength={2400} placeholder="Ask about your farm, orders or crops…" className="min-h-12 flex-1 resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-emerald-100" />
          <button disabled={busy || !input.trim()} className="inline-flex h-12 items-center gap-2 rounded-xl bg-forest px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Send size={16}/> Send</button>
        </form>
      </section>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-emerald-900/10 bg-white p-5">
          <div className="flex items-center gap-2 text-forest"><ShieldCheck size={18}/><h3 className="font-bold">Your data stays scoped</h3></div>
          <p className="mt-2 text-xs leading-5 text-slate-600">Marketplace figures are calculated from your authenticated account records inside the app. Private totals and messages are not sent to an external AI model. Agricultural answers are retrieved from approved source notes; generative replies are not enabled yet.</p>
        </div>
        <div className="rounded-2xl border border-emerald-900/10 bg-white p-5">
          <div className="flex items-center gap-2 text-forest"><BookOpen size={18}/><h3 className="font-bold">Agricultural sources</h3></div>
          {sources.length ? <ul className="mt-3 space-y-3">{sources.map((source) => <li key={source.id} className="text-xs leading-5"><a href={source.url} target="_blank" rel="noreferrer" className="font-semibold text-leaf underline underline-offset-2">{source.title}</a><p className="text-slate-500">{source.publisher}</p></li>)}</ul> : <p className="mt-2 text-xs leading-5 text-slate-600">When a verified guide matches your question, its publisher and link will appear here.</p>}
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 text-amber-900"><MicOff size={18}/><h3 className="font-bold">Typed input only</h3></div>
          <p className="mt-2 text-xs leading-5 text-amber-900">Voice recognition and spoken replies are not enabled. Tshivenda, Xitsonga and Sepedi replies are experimental and still need native-speaker review.</p>
        </div>
      </aside>
    </div>
  );
}
