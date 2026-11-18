import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
export default async function ListingReviewsPage({params}:{params:Promise<{listingId:string}>}){
 const {listingId}=await params;const supabase=await createClient();
 const [{data:listing},{data:reviews}]=await Promise.all([
  supabase.from("produce_listings").select("id,produce_name").eq("id",listingId).maybeSingle(),
  supabase.from("product_reviews").select("id,rating,review_text,created_at").eq("listing_id",listingId).order("created_at",{ascending:false}).limit(50)
 ]);
 if(!listing)notFound();
 const avg=reviews?.length?(reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1):"—";
 return <main className="agri-page scene-harvest min-h-screen"><AppNav active="marketplace"/><section className="mx-auto max-w-3xl px-5 py-8"><a href={`/marketplace/${listingId}`} className="text-sm font-bold text-emerald-800">← Back to produce</a><h1 className="mt-4 text-2xl font-bold text-emerald-950">{listing.produce_name} reviews</h1><p className="mt-2 text-sm text-slate-600">{avg} / 5 · {reviews?.length??0} verified reviews</p><div className="mt-5 space-y-3">{reviews?.map(r=><article key={r.id} className="rounded-xl border border-emerald-900/10 bg-white p-4"><p className="font-bold text-emerald-900">{r.rating} / 5</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{r.review_text}</p><time className="mt-2 block text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString("en-ZA")}</time></article>)}{!reviews?.length&&<p className="rounded-xl bg-white p-5 text-sm text-slate-500">No verified reviews yet.</p>}</div></section></main>;
}
