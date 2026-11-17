import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ListingForm } from "@/components/listing-form";

export default async function NewListingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role, locality, district, phone_e164").eq("id", user.id).single();
  if (profile?.role !== "farmer") redirect("/dashboard");
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/dashboard" className="text-sm font-bold text-forest">← Dashboard</Link>
      <h1 className="mt-6 text-3xl font-bold text-forest">List your harvest</h1>
      <p className="mt-2 text-sm text-slate-600">Tell nearby buyers what you have available.</p>
      {params.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">We could not publish this listing. Check the information and try again.</p>}
      <div className="mt-6"><ListingForm submissionId={crypto.randomUUID()} locality={profile.locality ?? ""} district={profile.district ?? "Vhembe"} contactPhone={profile.phone_e164 ?? ""} /></div>
    </main>
  );
}
