import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { registerFarmerForMember } from "@/actions/agent";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function AgentRegisterFarmerPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "agent") redirect("/dashboard");
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/dashboard" className="text-sm font-bold text-forest">← Dashboard</Link>
      <h1 className="mt-6 text-3xl font-bold text-forest">Register a farmer</h1>
      <p className="mt-2 text-sm text-slate-600">Use this assisted flow only after explaining the service and receiving the farmer's informed consent.</p>
      {params.created && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Farmer profile created and linked to your agent account.</p>}
      {params.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">The farmer could not be registered. Check the information and retry.</p>}
      <form action={registerFarmerForMember} className="mt-6 grid gap-4 rounded-2xl border border-emerald-900/10 bg-white p-6 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Farmer's full name<Input name="display_name" required minLength={2} maxLength={80} className="mt-2"/></label>
        <label className="text-sm font-semibold text-slate-700">Phone (optional)<Input name="phone_e164" type="tel" placeholder="+27..." className="mt-2"/></label>
        <label className="text-sm font-semibold text-slate-700">Preferred language<select name="preferred_language" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="en">English</option><option value="ve">Tshivenda (translation in progress)</option></select></label>
        <label className="text-sm font-semibold text-slate-700">District<Input name="district" defaultValue="Vhembe" required className="mt-2"/></label>
        <label className="text-sm font-semibold text-slate-700">Locality<Input name="locality" required className="mt-2"/></label>
        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Municipality (optional)<Input name="municipality" className="mt-2"/></label>
        <label className="flex items-start gap-3 text-xs leading-5 text-slate-600 sm:col-span-2"><input name="consent" type="checkbox" required className="mt-1 h-4 w-4 accent-forest"/><span>The farmer has received an explanation of the service, what data is collected and how it is used, and has explicitly agreed to account creation.</span></label>
        <Button type="submit" className="sm:col-span-2">Create assisted farmer profile</Button>
      </form>
    </main>
  );
}
