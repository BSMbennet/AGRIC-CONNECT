"use client";
import { useEffect, useMemo, useState } from "react";
import { createCartRequests } from "@/actions/requests";
type Listing={id:string;produce_name:string;asking_price:number;price_unit:string;unit:string;available:number;locality:string};
type CartItem={listing_id:string;quantity:number;request_type:"standard"|"preorder";requested_harvest_date:string|null};
export function CartPageClient({listings,defaultName="",defaultPhone=""}:{listings:Listing[];defaultName?:string;defaultPhone?:string}) {
 const [cart,setCart]=useState<CartItem[]>([]);
 const [ready,setReady]=useState(false);
 useEffect(()=>{try{setCart(JSON.parse(localStorage.getItem("agricnorthx-cart")||"[]"));}catch{setCart([]);}setReady(true);},[]);
 const available=useMemo(()=>new Map(listings.map(x=>[x.id,x])),[listings]);
 const lines=cart.map(item=>({item,listing:available.get(item.listing_id)})).filter(x=>x.listing);
 const total=lines.reduce((sum,x)=>sum+x.item.quantity*Number(x.listing!.asking_price),0);
 function save(next:CartItem[]){setCart(next);localStorage.setItem("agricnorthx-cart",JSON.stringify(next));}
 function update(id:string,patch:Partial<CartItem>){save(cart.map(x=>x.listing_id===id?{...x,...patch}:x));}
 if(!ready)return <p className="text-sm text-slate-500">Loading your cart…</p>;
 return <form action={createCartRequests} className="space-y-5">
  <input type="hidden" name="items" readOnly value={JSON.stringify(lines.map(x=>x.item))}/>
  {lines.length===0?<div className="rounded-2xl border border-dashed border-emerald-900/20 bg-white p-8 text-center"><p className="font-bold text-forest">Your cart is empty</p><p className="mt-2 text-sm text-slate-500">Add produce from the marketplace to prepare a buyer request.</p></div>:<>
   {lines.map(({item,listing})=><article key={item.listing_id} className="rounded-2xl border border-emerald-900/10 bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-forest">{listing!.produce_name}</h2><p className="text-sm text-slate-500">{listing!.locality} · R{Number(listing!.asking_price).toFixed(2)} / {listing!.price_unit}</p><p className="mt-1 text-xs text-slate-500">{listing!.available.toLocaleString()} {listing!.unit} currently available</p></div><button type="button" onClick={()=>save(cart.filter(x=>x.listing_id!==item.listing_id))} className="text-sm font-semibold text-red-700">Remove</button></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
     <label className="text-sm font-semibold text-slate-700">Quantity ({listing!.unit})<input type="number" min="0.01" max={listing!.available} step="0.01" required value={item.quantity} onChange={e=>update(item.listing_id,{quantity:Number(e.target.value)})} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"/></label>
     <label className="text-sm font-semibold text-slate-700">Request type<select value={item.request_type} onChange={e=>update(item.listing_id,{request_type:e.target.value as "standard"|"preorder",requested_harvest_date:e.target.value==="preorder"?item.requested_harvest_date:null})} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3"><option value="standard">Available produce</option><option value="preorder">Pre-order harvest</option></select></label>
     {item.request_type==="preorder"&&<label className="text-sm font-semibold text-slate-700">Expected harvest date<input type="date" required value={item.requested_harvest_date||""} onChange={e=>update(item.listing_id,{requested_harvest_date:e.target.value})} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"/></label>}
    </div>
   </article>)}
   <div className="rounded-2xl border border-emerald-900/10 bg-white p-5"><p className="flex justify-between font-bold text-forest"><span>Estimated subtotal</span><span>R{total.toFixed(2)}</span></p><p className="mt-1 text-xs text-slate-500">Estimate only; the farmer confirms the final price. No payment is collected here.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Buyer / business name<input name="buyer_name" required minLength={2} maxLength={120} defaultValue={defaultName} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"/></label><label className="text-sm font-semibold text-slate-700">Contact number<input name="contact_number" type="tel" required minLength={7} maxLength={30} defaultValue={defaultPhone} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"/></label><label className="text-sm font-semibold text-slate-700">Fulfilment<select name="fulfilment_preference" defaultValue="collection" className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3"><option value="collection">Collection</option><option value="delivery">Delivery</option></select></label><label className="text-sm font-semibold text-slate-700">Delivery location<input name="delivery_location" maxLength={300} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3" placeholder="Required for delivery"/></label></div>
    <label className="mt-3 block text-sm font-semibold text-slate-700">Message to farmers (optional)<textarea name="message" maxLength={500} rows={2} className="mt-1 w-full rounded-lg border border-slate-200 p-3"/></label>
    <button disabled={!lines.length} className="mt-4 w-full rounded-xl bg-forest px-5 py-3 text-sm font-bold text-white hover:bg-leaf disabled:opacity-40">Send requests to farmers</button>
   </div>
  </>}
 </form>;
}
