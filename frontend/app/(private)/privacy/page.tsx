import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <Link href="/dashboard" className="text-sm font-bold text-forest">← Dashboard</Link>
      <h1 className="mt-6 text-3xl font-bold text-forest">AgriConnect privacy notice</h1>
      <p className="mt-3 text-sm text-slate-500">Pilot notice · Version 1 · 17 November 2026</p>
      <div className="mt-8 space-y-5 text-sm leading-7 text-slate-700">
        <section><h2 className="font-bold text-forest">Information we collect</h2><p>We collect account details, contact information you choose to provide, preferred language, district and locality, produce listings, buyer requests and order activity needed to operate the pilot.</p></section>
        <section><h2 className="font-bold text-forest">How information is used</h2><p>Information is used to create accounts, publish farmer-approved produce details, connect buyers and farmers, coordinate orders, prevent duplicate submissions and support platform security.</p></section>
        <section><h2 className="font-bold text-forest">What buyers can see</h2><p>Signed-in buyers can see active listing information and approximate locality. Private phone numbers and exact farm or home coordinates are not displayed on public listings.</p></section>
        <section><h2 className="font-bold text-forest">Your choices</h2><p>You may request access to or correction of your information, ask questions about its use, or request deletion subject to applicable legal retention obligations. Contact the pilot administrator through your cooperative or project contact.</p></section>
        <section><h2 className="font-bold text-forest">Demo and pilot limitations</h2><p>Demo records are synthetic and labelled as such. Listing quantities and prices are supplied by users and are not independently verified. AgriConnect does not hold payments or guarantee buyers, prices or income.</p></section>
        <p className="rounded-xl bg-amber-50 p-4 text-amber-900">This notice supports a controlled prototype and is not legal advice. Obtain South African privacy-law review before commercial launch.</p>
      </div>
    </main>
  );
}
