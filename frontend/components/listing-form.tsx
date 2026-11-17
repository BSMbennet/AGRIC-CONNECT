"use client";
import {useState} from "react";
import {createListing} from "@/actions/listings";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {saveDraft} from "@/lib/offline/db";
export function ListingForm({submissionId,locality="",district="Vhembe",farmerId,contactPhone=""}:{submissionId:string;locality?:string;district?:string;farmerId?:string;contactPhone?:string}){
 const [offlineState,setOfflineState]=useState("");
 async function handleSubmit(event:React.FormEvent<HTMLFormElement>){
  if(navigator.onLine)return;event.preventDefault();setOfflineState("Saving this listing on your device…");
  const form=new FormData(event.currentTarget);
  try{await saveDraft({client_submission_id:String(form.get("client_submission_id")),farmer_id:String(form.get("farmer_id")||"")||undefined,category:String(form.get("category")),is_organic:form.get("is_organic")==="true",produce_name:String(form.get("produce_name")),quantity_available:Number(form.get("quantity_available")),unit:String(form.get("unit")) as "kg"|"bunch"|"crate"|"bag",asking_price:Number(form.get("asking_price")),price_unit:String(form.get("price_unit")) as "kg"|"bunch"|"crate"|"bag",available_from:String(form.get("available_from")),harvest_date:String(form.get("harvest_date")),expires_at:String(form.get("expires_at")||""),quality_notes:String(form.get("quality_notes")||""),locality:String(form.get("locality")),municipality:String(form.get("municipality")||""),district:String(form.get("district")),contact_phone:String(form.get("contact_phone")),fulfilment_details:String(form.get("fulfilment_details")),saved_at:new Date().toISOString()});setOfflineState("Saved on this device. It will sync when a connection returns.");}catch{setOfflineState("Needs attention: this device could not save the draft.");}
 }
 return <form action={createListing} onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-soft sm:grid-cols-2">
 <input type="hidden" name="client_submission_id" value={submissionId}/>{farmerId&&<input type="hidden" name="farmer_id" value={farmerId}/>}
 <label className="text-sm font-semibold text-slate-700">Produce name<Input name="produce_name" required minLength={2} placeholder="Tomatoes" className="mt-2"/></label>
 <label className="text-sm font-semibold text-slate-700">Category<select name="category" required className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">{["Vegetables","Fruit","Grains","Legumes","Herbs","Other"].map(x=><option key={x}>{x}</option>)}</select></label>
 <label className="text-sm font-semibold text-slate-700">Organic status<select name="is_organic" required defaultValue="" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="" disabled>Choose yes or no</option><option value="true">Yes - grown organically</option><option value="false">No - not organic</option></select></label>
 <label className="text-sm font-semibold text-slate-700">Quantity available<Input name="quantity_available" type="number" min="0.01" step="0.01" required className="mt-2"/></label>
 <label className="text-sm font-semibold text-slate-700">Unit<select name="unit" required className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">{["kg","bunch","crate","bag"].map(x=><option key={x}>{x}</option>)}</select></label>
 <label className="text-sm font-semibold text-slate-700">Price (ZAR)<Input name="asking_price" type="number" min="0" step="0.01" required className="mt-2"/></label>
 <label className="text-sm font-semibold text-slate-700">Price per<select name="price_unit" required className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">{["kg","bunch","crate","bag"].map(x=><option key={x}>{x}</option>)}</select></label>
 <label className="text-sm font-semibold text-slate-700">Harvest date<Input name="harvest_date" type="date" required className="mt-2"/></label>
 <label className="text-sm font-semibold text-slate-700">Available from<Input name="available_from" type="date" required defaultValue={new Date().toISOString().slice(0,10)} className="mt-2"/></label>
 <label className="text-sm font-semibold text-slate-700">Expiry / urgency date (optional)<Input name="expires_at" type="datetime-local" className="mt-2"/></label>
 <label className="text-sm font-semibold text-slate-700">Locality<Input name="locality" required defaultValue={locality} placeholder="Thohoyandou" className="mt-2"/></label>
 <label className="text-sm font-semibold text-slate-700">Municipality (optional)<Input name="municipality" className="mt-2"/></label>
 <label className="text-sm font-semibold text-slate-700">District<Input name="district" required defaultValue={district} className="mt-2"/></label>
 <label className="text-sm font-semibold text-slate-700">Contact number for buyers<Input name="contact_phone" type="tel" required minLength={7} defaultValue={contactPhone} placeholder="+27…" className="mt-2"/></label>
 <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Fulfilment details<Input name="fulfilment_details" required minLength={5} maxLength={500} placeholder="Collection point, delivery areas, preferred times…" className="mt-2"/></label>
 <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Optional notes<textarea name="quality_notes" maxLength={500} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Quality, grading or packaging notes…"/></label>
 <p className="text-xs leading-5 text-slate-500 sm:col-span-2">Your contact number and fulfilment details are shared with a buyer only when they submit an order request. Approximate locality is visible on the public marketplace.</p>
 {offlineState&&<p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2">{offlineState}</p>}
 <Button type="submit" className="sm:col-span-2">Publish produce listing</Button></form>;
}
