import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ListingPhotoUploader } from "@/components/listing-photo-uploader";
export default async function ListingPhotosPage({params}:{params:Promise<{id:string}>}) {
 const {id}=await params,supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();
 if(!user) redirect("/login");
 const {data:listing}=await supabase.from("produce_listings").select("id,produce_name,farmer_id,image_urls").eq("id",id).maybeSingle();
 if(!listing||listing.farmer_id!==user.id) notFound();
 return <main className="agri-page scene-harvest min-h-screen"><AppNav active="dashboard"/><section className="mx-auto max-w-3xl px-5 py-10"><Link href="/dashboard" className="text-sm font-bold text-leaf">← Dashboard</Link><h1 className="mt-6 text-3xl font-bold text-forest">Photos for {listing.produce_name}</h1><p className="mt-2 text-sm text-slate-600">Upload your own pictures, choose the main photo, or remove photos you no longer want.</p><ListingPhotoUploader listingId={listing.id} existingUrls={listing.image_urls??[]}/><Link href={"/marketplace/"+listing.id} className="mt-5 inline-flex rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-forest">View listing</Link></section></main>;
}
