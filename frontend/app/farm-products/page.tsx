import { getTranslations } from "next-intl/server";
import { AppNav } from "@/components/app-nav";
import Link from "next/link";
import {createClient} from "@/lib/supabase/server";
import {MyProducts} from "@/components/my-products";
export const metadata={title:"Agricultural product library | AgricNorthX"};
export default async function FarmProductsPage({searchParams}:{searchParams:Promise<{removed?:string;error?:string}>}){
 const sp=await searchParams;
 const t=await getTranslations("products");
 const supabase=await createClient();
 const {data:products,error}=await supabase.from("farmer_products").select("id,name,category,summary,required_plan").eq("is_active",true).order("category").order("name");
 return <main className="agri-page scene-harvest"><AppNav/><section className="mx-auto max-w-6xl px-5 py-10"><p className="text-xs font-bold uppercase tracking-widest text-leaf">{t("libraryLabel")}</p><h1 className="mt-2 text-3xl font-bold text-forest">{t("libraryTitle")}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{t("libraryIntro")}</p>
 <MyProducts removed={sp.removed} error={sp.error}/>
 <h2 className="mt-12 text-xl font-bold text-forest">{t("libraryHeading")}</h2>
 {error&&<p role="alert" className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{t("libraryError")}</p>}
 {!error&&products?.length===0&&<div className="mt-6 rounded-2xl border border-dashed border-emerald-900/20 bg-white p-8 text-sm text-slate-600">{t("libraryEmpty")}</div>}
 <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(products||[]).map(product=><article key={product.id} className="rounded-2xl border border-emerald-900/10 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-leaf">{product.category.replaceAll("_"," ")}</p><h2 className="mt-2 text-lg font-bold text-forest">{product.name}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{product.summary}</p><div className="mt-4 flex items-center justify-between gap-2"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900">{product.required_plan==="free"?t("planFree"):product.required_plan==="pro"?t("planPro"):t("planPremium")}</span><Link href={"/farm-products/"+product.id} className="text-sm font-bold text-leaf">{t("viewDetails")}</Link></div></article>)}</div></section></main>;
}
