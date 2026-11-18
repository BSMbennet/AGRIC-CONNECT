import { AppNav } from "@/components/app-nav";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
export const metadata={title:"Farmer subscriptions | AgricNorthX"};
export default async function SubscriptionsPage({searchParams}:{searchParams:Promise<{status?:string;error?:string}>}){
 const p=await searchParams,supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();
 if(!user) redirect("/login?next=/subscriptions");
 const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).single();
 if(profile?.role!=="farmer") redirect("/dashboard");
 const {data:sub}=await supabase.from("farmer_subscriptions").select("plan,status,current_period_end").eq("farmer_id",user.id).in("status",["active","trialing","past_due"]).order("current_period_end",{ascending:false}).limit(1).maybeSingle();
 const active=!!sub?.current_period_end&&new Date(sub.current_period_end)>new Date()&&["active","trialing"].includes(sub.status);
 return <main className="agri-page scene-community"><AppNav/><section className="mx-auto max-w-5xl px-5 py-10"><p className="text-xs font-bold uppercase tracking-widest text-leaf">Farmer access</p><h1 className="mt-2 text-3xl font-bold text-forest">Unlock selected agricultural products</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Registration, produce listings and buyer discovery stay free. Subscribe only when you need the detailed information and usage guidance attached to selected products.</p>
 {p.status==="success"&&<p role="status" className="mt-5 rounded-xl bg-emerald-100 p-3 text-sm text-emerald-900">Checkout completed. Access is activated after Stripe confirms your subscription.</p>}
 {p.error&&<p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">Checkout could not be started. Check the billing configuration or contact support.</p>}
 {active&&<p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">Your {sub?.plan} subscription is active until {new Date(sub!.current_period_end!).toLocaleDateString()}.</p>}
 <div className="mt-7 grid gap-5 md:grid-cols-2">{[{plan:"pro",name:"Farmer Pro",desc:"Access products marked Free and Pro, including their detailed descriptions and practical usage guidance."},{plan:"premium",name:"Farmer Premium",desc:"Access all Free, Pro and Premium product information and guidance."}].map(x=><article key={x.plan} className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-forest">{x.name}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{x.desc}</p><p className="mt-5 text-xs text-slate-500">Monthly price is configured in Stripe. No price is invented or displayed here.</p><form action="/api/billing/checkout" method="post" className="mt-5"><input type="hidden" name="plan" value={x.plan}/><button disabled={active} className="w-full rounded-xl bg-forest px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{active?"An active subscription is already on your account":"Continue to secure checkout"}</button></form></article>)}</div>
 <p className="mt-6 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-900">A subscription unlocks digital product information and guidance only. It does not purchase physical goods, include delivery or guarantee crop outcomes. Always follow product labels and local regulations, especially for crop-protection products.</p></section></main>;
}
