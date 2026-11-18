import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { CartPageClient } from "@/components/cart-page-client";
export default async function CartPage(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/login?next=/cart");
 const [{data:profile},{data:listings}]=await Promise.all([
  supabase.from("profiles").select("display_name,phone_e164,role").eq("id",user.id).maybeSingle(),
  supabase.from("produce_listings").select("id,produce_name,asking_price,price_unit,unit,quantity_available,reserved_quantity,quantity_sold,locality").eq("status","active").or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).limit(100)
 ]);
 if(profile?.role!=="buyer")return <main className="min-h-screen agri-page"><AppNav active="cart"/><section className="mx-auto max-w-3xl px-5 py-10"><h1 className="text-3xl font-bold text-forest">Buyer cart</h1><p className="mt-3 text-slate-600">Switch to a buyer account to prepare purchase requests.</p></section></main>;
 const items=(listings??[]).map(x=>({...x,available:Math.max(0,Number(x.quantity_available)-Number(x.reserved_quantity)-Number(x.quantity_sold))})).filter(x=>x.available>0);
 return <main className="min-h-screen agri-page"><AppNav active="cart"/><section className="mx-auto max-w-3xl px-5 py-10"><p className="text-sm font-semibold text-leaf">Marketplace</p><h1 className="mt-2 text-3xl font-bold text-forest">Buyer cart</h1><p className="mt-2 text-sm text-slate-600">Prepare requests for one or more farmers. Stock is reserved only after each farmer accepts.</p><div className="mt-6"><CartPageClient listings={items} defaultName={profile.display_name??""} defaultPhone={profile.phone_e164??""}/></div></section></main>;
}
