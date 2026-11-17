"use client";

import { useCallback, useEffect, useState } from "react";
import { syncDrafts } from "@/lib/offline/sync";
import { listDrafts } from "@/lib/offline/db";

type SyncState = "saved" | "waiting" | "syncing" | "synced" | "attention";

const labels: Record<SyncState, string> = {
  saved: "Saved on this device",
  waiting: "Waiting for connection",
  syncing: "Syncing",
  synced: "Synced",
  attention: "Needs attention",
};

export function SyncBadge() {
  const [state, setState] = useState<SyncState>("synced");
  const [count, setCount] = useState(0);
  const [online, setOnline] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const drafts = await listDrafts();
      setCount(drafts.length);
      if (drafts.length > 0) setState(navigator.onLine ? "saved" : "waiting");
      else setState("synced");
    } catch {
      setState("attention");
    }
  }, []);

  const sync = useCallback(async () => {
    if (!navigator.onLine) {
      setState("waiting");
      return;
    }
    setState("syncing");
    try {
      const result = await syncDrafts();
      setCount(result.remaining);
      setState(result.failed > 0 ? "attention" : "synced");
    } catch {
      setState("attention");
    }
  }, []);

  useEffect(() => {
    void refresh();
    setOnline(navigator.onLine);
    const onOnline = () => { setOnline(true); void sync(); };
    const onOffline = () => { setOnline(false); setState("waiting"); };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refresh, sync]);

  return <div role="status" className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-forest"><span className={state === "attention" ? "h-2 w-2 rounded-full bg-red-500" : state === "syncing" ? "h-2 w-2 animate-pulse rounded-full bg-amber-500" : "h-2 w-2 rounded-full bg-leaf"}/>{labels[state]}{count > 0 ? ` · ${count}` : ""}{count > 0 && online && <button type="button" onClick={() => void sync()} className="underline">Retry</button>}</div>;
}
