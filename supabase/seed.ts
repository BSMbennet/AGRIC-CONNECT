import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const password = process.env.DEMO_PASSWORD;

if (!url || !secret || !password || password.length < 12) {
  throw new Error("Set SUPABASE_URL, SUPABASE_SECRET_KEY and DEMO_PASSWORD (minimum 12 characters) before seeding.");
}

const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });

const demoUsers = [
  { email: "agent@demo.agriconnect.invalid", role: "agent", name: "Demo Community Agent", coop: false },
  { email: "manager@demo.agriconnect.invalid", role: "cooperative_manager", name: "Demo Cooperative Manager", coop: true },
  { email: "farmera@demo.agriconnect.invalid", role: "farmer", name: "Demo Farmer A", coop: true },
  { email: "farmerb@demo.agriconnect.invalid", role: "farmer", name: "Demo Farmer B", coop: true },
  { email: "buyer@demo.agriconnect.invalid", role: "buyer", name: "Demo Buyer", coop: false },
  { email: "admin@demo.agriconnect.invalid", role: "admin", name: "Demo Admin", coop: false },
] as const;

const { data: listedUsers, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw listError;

let { data: cooperative, error: cooperativeError } = await admin.from("cooperatives")
  .select("id").eq("name", "Vhembe Demo Cooperative").maybeSingle();
if (cooperativeError) throw cooperativeError;
if (!cooperative) {
  const createdCooperative = await admin.from("cooperatives")
    .insert({ name: "Vhembe Demo Cooperative", locality: "Thohoyandou", verification_status: "verified" })
    .select("id").single();
  if (createdCooperative.error) throw createdCooperative.error;
  cooperative = createdCooperative.data;
}

const userIds: Record<string, string> = {};
for (const demo of demoUsers) {
  let user = listedUsers.users.find((item) => item.email === demo.email);
  if (!user) {
    const created = await admin.auth.admin.createUser({
      email: demo.email,
      password,
      email_confirm: true,
    });
    if (created.error) throw created.error;
    user = created.data.user;
  }
  userIds[demo.email] = user.id;
}

const agentId = userIds["agent@demo.agriconnect.invalid"];
for (const demo of demoUsers) {
  const id = userIds[demo.email];
  const { error } = await admin.from("profiles").upsert({
    id,
    role: demo.role,
    display_name: demo.name,
    district: "Vhembe",
    municipality: "Thulamela",
    locality: "Thohoyandou",
    cooperative_id: demo.coop ? cooperative.id : null,
    onboarding_status: "self",
    created_by_agent_id: demo.role === "farmer" ? agentId : null,
    preferred_language: "en",
  }, { onConflict: "id" });
  if (error) throw error;

  const { data: existingConsent, error: consentLookupError } = await admin.from("consents")
    .select("id").eq("profile_id", id).eq("consent_type", "account").maybeSingle();
  if (consentLookupError) throw consentLookupError;
  if (!existingConsent) {
    const consent = await admin.from("consents").insert({
      profile_id: id,
      consent_type: "account",
      consent_version: "demo-v1",
      granted: true,
      method: "web_form",
    });
    if (consent.error) throw consent.error;
  }
}

const listings = [
  { farmer: "farmera@demo.agriconnect.invalid", submission: "00000000-0000-4000-8000-000000000001", produce_name: "Demo Tomatoes", category: "Vegetables", quantity_available: 40, unit: "kg", asking_price: 15, price_unit: "kg" },
  { farmer: "farmerb@demo.agriconnect.invalid", submission: "00000000-0000-4000-8000-000000000002", produce_name: "Demo Tomatoes", category: "Vegetables", quantity_available: 20, unit: "kg", asking_price: 14, price_unit: "kg" },
  { farmer: "farmera@demo.agriconnect.invalid", submission: "00000000-0000-4000-8000-000000000003", produce_name: "Demo Spinach", category: "Vegetables", quantity_available: 10, unit: "bunch", asking_price: 20, price_unit: "bunch" },
];

for (const listing of listings) {
  const { error } = await admin.from("produce_listings").upsert({
    farmer_id: userIds[listing.farmer],
    cooperative_id: cooperative.id,
    category: listing.category,
    produce_name: listing.produce_name,
    quantity_available: listing.quantity_available,
    unit: listing.unit,
    asking_price: listing.asking_price,
    price_unit: listing.price_unit,
    locality: "Thohoyandou",
    municipality: "Thulamela",
    district: "Vhembe",
    status: "active",
    source_channel: "import",
    client_submission_id: listing.submission,
  }, { onConflict: "farmer_id,client_submission_id" });
  if (error) throw error;
}

console.log("AgriConnect synthetic demo data seeded. All records are labelled Demo.");
console.log("Demo sign-in emails:", demoUsers.map((user) => user.email).join(", "));
console.log("Use the DEMO_PASSWORD value you supplied; do not reuse it for real accounts.");
