import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AggregateForm } from "@/components/aggregate-form";

export default async function AggregatePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role,cooperative_id").eq("id", user.id).single();
  if (!profile || !["buyer", "cooperative_manager"].includes(profile.role)) redirect("/dashboard");
  let query = supabase.from("produce_listings").select("id,farmer_id,produce_name,quantity_available,reserved_quantity,quantity_sold,unit,asking_price,locality,cooperative_id").eq("status", "active");
  if (profile.role === "cooperative_manager") {
    if (!profile.cooperative_id) redirect("/dashboard?error=cooperative");
    query = query.eq("cooperative_id", profile.cooperative_id);
  }
  const { data } = await query.order("created_at", { ascending: false }).limit(60);
  const listings = (data ?? []).map((item) => ({
    ...item,
    quantity_available: Number(item.quantity_available),
    reserved_quantity: Number(item.reserved_quantity),
    quantity_sold: Number(item.quantity_sold),
    asking_price: Number(item.asking_price),
  }));
  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/dashboard" className="text-sm font-bold text-forest">← Dashboard</Link>
      <h1 className="mt-6 text-3xl font-bold text-forest">Combine local harvests</h1>
      <p className="mt-2 text-sm text-slate-600">Build one buyer order from supply offered by at least two farmers. The database reserves every allocation atomically.</p>
      {params.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">The combined order could not be created. Check stock, farmer membership and quantities.</p>}
      {listings.length >= 2 ? <AggregateForm listings={listings}/> : <p className="mt-6 rounded-2xl bg-white p-6 text-sm text-slate-600">At least two active farmer listings are needed before supply can be combined.</p>}
    </main>
  );
}
