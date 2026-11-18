import Link from "next/link";
import { AppNav } from "@/components/app-nav";

export function BookkeepingUnavailable({ notSetUp }: { notSetUp: boolean }) {
  return (
    <main className="agri-page scene-harvest">
      <AppNav />
      <section className="mx-auto max-w-xl px-5 py-12">
        <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
          <h1 className="text-xl font-bold text-amber-900">{notSetUp ? "Bookkeeping is not set up yet" : "Bookkeeping is temporarily unavailable"}</h1>
          <p className="mt-2 text-sm text-amber-900">{notSetUp ? "The bookkeeping database tables have not been created on this site yet. Nothing you entered has been lost. Please ask the site administrator to finish the setup." : "We could not load your entries. Your records are safe. Please try again in a few minutes."}</p>
          <Link href="/dashboard" className="mt-4 inline-block rounded-xl bg-forest px-5 py-2.5 text-sm font-bold text-white">Back to dashboard</Link>
        </div>
      </section>
    </main>
  );
}
