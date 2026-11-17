import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ListingForm } from "@/components/listing-form";

export default async function AgentFarmerListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: agent } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (agent?.role !== "agent") redirect("/dashboard");
  const { data: farmer } = await supabase.from("profiles")
    .select("id,display_name,locality,district,created_by_agent_id")
    .eq("id", id).eq("created_by_agent_id", user.id).single();
  if (!farmer) notFound();
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/agent/register-farmer" className="text-sm font-bold text-forest">← Agent workspace</Link>
      <h1 className="mt-6 text-3xl font-bold text-forest">Add produce for {farmer.display_name}</h1>
      <p className="mt-2 text-sm text-slate-600">Confirm the crop, quantity and price with the farmer before publishing.</p>
      <div className="mt-6"><ListingForm submissionId={crypto.randomUUID()} farmerId={farmer.id} locality={farmer.locality ?? ""} district={farmer.district ?? "Vhembe"}/></div>
    </main>
  );
}
