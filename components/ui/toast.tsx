"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";
type ToastMessage = { id: number; title: string; description?: string; tone: ToastTone };

const ToastContext = React.createContext<{ toast: (message: Omit<ToastMessage, "id">) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = React.useState<ToastMessage[]>([]);
  const toast = React.useCallback((message: Omit<ToastMessage, "id">) => {
    const id = Date.now() + Math.random();
    setMessages((current) => [...current, { ...message, id }]);
    window.setTimeout(() => setMessages((current) => current.filter((item) => item.id !== id)), 4500);
  }, []);
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div aria-live="polite" aria-atomic="false" className="fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {messages.map((message) => <div key={message.id} role={message.tone === "error" ? "alert" : "status"} className={cn("rounded-xl border bg-white p-4 shadow-soft", message.tone === "error" ? "border-red-200" : "border-emerald-100")}>
          <p className="text-sm font-bold text-forest">{message.title}</p>
          {message.description && <p className="mt-1 text-sm text-slate-600">{message.description}</p>}
        </div>)}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
