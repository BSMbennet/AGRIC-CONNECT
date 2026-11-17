import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { FieldTruthWorkspace } from "@/components/field-truth-workspace";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "My Fields | AgricNorthX",
  description: "Record private field observations to build a more trustworthy farm profile."
};

type FieldProfile = {
  id: string;
  field_name: string;
  locality: string;
  soil_texture: string;
  drainage: string;
  soil_ph: number | null;
  soil_ph_source: string;
  soil_test_date: string | null;
  previous_crop: string | null;
  field_notes: string | null;
  created_at: string;
  updated_at: string;
};

export default async function FieldsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "farmer") redirect("/dashboard");

  const { data } = await supabase
    .from("farm_field_profiles")
    .select("id,field_name,locality,soil_texture,drainage,soil_ph,soil_ph_source,soil_test_date,previous_crop,field_notes,created_at,updated_at")
    .eq("farmer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <main className="min-h-screen bg-[#f7faf7]">
      <AppNav active="fields" />
      <section className="bg-forest text-white">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-200">AgricNorthX · Field Truth</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Know your field, not just your locality.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/85">
            Record what you have observed or measured on your own land. These private field notes will become the foundation for more relevant crop and irrigation guidance.
          </p>
        </div>
      </section>
      <FieldTruthWorkspace initialFields={(data ?? []) as FieldProfile[]} />
    </main>
  );
}
