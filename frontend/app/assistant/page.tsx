import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { AssistantChat } from "@/components/assistant-chat";

export default async function AssistantPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <main className="min-h-screen agri-page">
      <AppNav active="assistant" />
      <section className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
        <p className="text-sm font-semibold text-leaf">AgricNorthX intelligence</p>
        <h1 className="mt-2 text-3xl font-bold text-forest">Farm assistant</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">A practical assistant grounded in your own marketplace records and a growing library of South African agricultural publications.</p>
        <div className="mt-7"><AssistantChat /></div>
      </section>
    </main>
  );
}
