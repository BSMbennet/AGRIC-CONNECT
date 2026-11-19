import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { register } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const t = await getTranslations("auth");
  return (
    <main className="agri-page scene-community min-h-screen"><AppNav/><section className="mx-auto flex min-h-[80vh] max-w-xl flex-col justify-center px-5 py-12">
      <Link href="/" className="mb-8 text-sm font-bold text-forest">← AgricNorthX</Link>
      <div className="rounded-3xl border border-emerald-900/10 bg-white p-7 shadow-soft sm:p-9">
        <h1 className="text-2xl font-bold text-forest">{t("registerTitle")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("registerIntro")}</p>
        {params.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{t("registerError")}</p>}
        <form action={register} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">{t("fullName")}<Input name="displayName" required minLength={2} maxLength={80} className="mt-2" /></label>
          <label className="text-sm font-semibold text-slate-700">{t("accountType")}<select name="role" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="farmer">{t("farmer")}</option><option value="buyer">{t("buyer")}</option></select></label>
          <label className="text-sm font-semibold text-slate-700">{t("phoneOptional")}<Input name="phone" type="tel" maxLength={20} placeholder="+27..." className="mt-2" /></label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">{t("email")}<Input name="email" type="email" autoComplete="email" required className="mt-2" /></label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">{t("password")}<Input name="password" type="password" autoComplete="new-password" minLength={8} required className="mt-2" /></label>
          <label className="text-sm font-semibold text-slate-700">{t("district")}<Input name="district" defaultValue="Vhembe" required className="mt-2" /></label>
          <label className="text-sm font-semibold text-slate-700">{t("locality")}<Input name="locality" required placeholder={t("localityPlaceholder")} className="mt-2" /></label>
          <label className="flex items-start gap-3 text-xs leading-5 text-slate-600 sm:col-span-2"><input type="checkbox" name="consent" required className="mt-1 h-4 w-4 accent-forest" /><span>{t("consent")}</span></label>
          <Button type="submit" className="sm:col-span-2">{t("create")}</Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">{t("already")} <Link href="/login" className="font-bold text-leaf">{t("signIn")}</Link></p>
      </div>
    </section></main>
  );
}
