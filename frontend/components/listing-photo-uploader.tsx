"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const UPLOAD_URL = "https://agriconnect-image-upload.agriconnect-vhembe-2026.workers.dev";

export function ListingPhotoUploader({ listingId, existingUrls }: { listingId: string; existingUrls: string[] }) {
 const [files,setFiles]=useState<File[]>([]);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const router=useRouter();
 const remaining=Math.max(0,5-existingUrls.length);
 async function upload() {
  if(!files.length||busy) return;
  setBusy(true); setMessage("");
  try {
   const supabase=createClient();
   const {data:{session}}=await supabase.auth.getSession();
   if(!session?.access_token) throw new Error("Please sign in again.");
   let done=0;
   for(const file of files.slice(0,remaining)) {
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)) throw new Error("Use JPG, PNG or WebP images.");
    if(file.size>5*1024*1024) throw new Error("Each image must be 5 MB or smaller.");
    const response=await fetch(UPLOAD_URL+"?listing_id="+encodeURIComponent(listingId),{method:"PUT",headers:{Authorization:"Bearer "+session.access_token,"Content-Type":file.type},body:file});
    const result=await response.json();
    if(!response.ok) throw new Error(result.error||"Upload failed. Please try again.");
    done++;
   }
   setFiles([]); setMessage(done+" photo(s) uploaded. Buyers can now see them."); router.refresh();
  } catch(e) { setMessage(e instanceof Error?e.message:"Upload failed."); }
  finally { setBusy(false); }
 }
 return <section className="mt-6 rounded-2xl border border-emerald-900/10 bg-white p-6">
  <h2 className="text-lg font-bold text-forest">Product photos</h2>
  <p className="mt-1 text-sm text-slate-600">Add up to 5 clear photos. JPG, PNG or WebP, maximum 5 MB each.</p>
  {existingUrls.length>0&&<div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{existingUrls.map((url,i)=><img key={url} src={url} alt={"Produce photo "+(i+1)} className="aspect-square w-full rounded-xl object-cover"/>)}</div>}
  {remaining>0?<><label className="mt-4 block text-sm font-semibold text-slate-700">Choose photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>setFiles(Array.from(e.target.files||[]).slice(0,remaining))} className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-semibold file:text-forest"/></label>
  {files.length>0&&<p className="mt-2 text-xs text-slate-500">{files.length} selected</p>}
  <button type="button" onClick={upload} disabled={!files.length||busy} className="mt-4 rounded-xl bg-forest px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?"Uploading…":"Upload photos"}</button></>:<p className="mt-4 text-sm text-emerald-800">You have added the maximum of 5 photos.</p>}
  {message&&<p role="status" className="mt-3 text-sm text-slate-700">{message}</p>}
 </section>;
}
