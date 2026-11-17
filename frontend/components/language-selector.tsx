"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePreferredLanguage } from "@/actions/preferences";

export function LanguageSelector({ value = "en" }: { value?: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return <label className="inline-flex items-center gap-2 text-xs text-slate-500"><span>Language</span><select aria-label="Language" disabled={pending} value={value} onChange={(event) => startTransition(async () => { await updatePreferredLanguage(event.target.value); router.refresh(); })} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-forest"><option value="en">English</option><option value="ve">Tshivenda (translation in progress)</option></select></label>;
}
