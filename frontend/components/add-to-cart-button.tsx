"use client";
import { useState } from "react";
export function AddToCartButton({listingId, sellerId, currentUserId, disabled=false}:{listingId:string;sellerId?:string|null;currentUserId?:string|null;disabled?:boolean}) {
  const [added,setAdded]=useState(false);
  if (sellerId && currentUserId && sellerId === currentUserId) return <p className="mt-2 rounded-xl bg-slate-100 px-3 py-2.5 text-center text-xs font-semibold text-slate-600">This is your own listing — buyers can add it to their cart.</p>;
  function add() {
    try {
      const current=JSON.parse(localStorage.getItem("agricnorthx-cart")||"[]") as {listing_id:string;quantity:number;request_type:"standard"|"preorder";requested_harvest_date:string|null}[];
      const found=current.find(x=>x.listing_id===listingId);
      if(found) found.quantity+=1;
      else current.push({listing_id:listingId,quantity:1,request_type:"standard",requested_harvest_date:null});
      localStorage.setItem("agricnorthx-cart",JSON.stringify(current));
      setAdded(true);
    } catch { setAdded(false); }
  }
  return <button type="button" disabled={disabled} onClick={add} className="mt-2 w-full rounded-xl border border-emerald-800 px-4 py-2.5 text-sm font-bold text-forest hover:bg-emerald-50 disabled:opacity-40">{added?"Added to cart":"Add to cart"}</button>;
}
