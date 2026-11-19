import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { redirect } from "next/navigation";
import { login } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; registered?: string }> }) {
  const params = await searchParams;
  const t = await getTranslations("auth");
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (claimsData?.claims) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", claimsData.claims.sub).maybeSingle();
    if (profile?.role) redirect("/dashboard");
  }
  return (
    <main className="agri-page scene-fields min-h-screen"><AppNav/><section className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-5 py-12">
      <Link href="/" className="mb-8 text-sm font-bold text-forest">← AgricNorthX</Link>
      <div className="rounded-3xl border border-emerald-900/10 bg-white p-7 shadow-soft">
        <h1 className="text-2xl font-bold text-forest">{t("loginTitle")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("loginIntro")}</p>
        {params.registered && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{t("registered")}</p>}
        {params.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{t("loginError")}</p>}
        <form action={login} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-slate-700">{t("email")}<Input name="email" type="email" autoComplete="email" required placeholder="you@example.com" className="mt-2" /></label>
          <label className="block text-sm font-semibold text-slate-700">{t("password")}<Input name="password" type="password" autoComplete="current-password" required minLength={8} className="mt-2" /></label>
          <Button type="submit" className="w-full">{t("signIn")}</Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">{t("newHere")} <Link href="/register" className="font-bold text-leaf">{t("createAccount")}</Link></p>
      </div>
    </section></main>
  );
}
