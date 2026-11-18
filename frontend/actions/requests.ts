"use server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const requestSchema=z.object({
 listing_id:z.string().uuid(),quantity_requested:z.coerce.number().positive(),
 proposed_price:z.preprocess(v=>v===""||v==null?undefined:v,z.coerce.number().min(0).optional()),
 message:z.string().trim().max(500).optional(),
 buyer_name:z.string().trim().min(2).max(120),contact_number:z.string().trim().min(7).max(30),
 fulfilment_preference:z.enum(["delivery","collection"]),delivery_location:z.string().trim().max(300).optional(),
 order_instructions:z.string().trim().max(1000).optional(),
 request_type:z.enum(["standard","preorder"]).default("standard"),
 requested_harvest_date:z.string().optional()
}).superRefine((v,ctx)=>{
 if(v.fulfilment_preference==="delivery"&&(v.delivery_location||"").trim().length<5)ctx.addIssue({code:"custom",path:["delivery_location"],message:"A delivery location is required"});
 if(v.request_type==="preorder"&&(!v.requested_harvest_date||!/^\d{4}-\d{2}-\d{2}$/.test(v.requested_harvest_date)))ctx.addIssue({code:"custom",path:["requested_harvest_date"],message:"Choose an expected harvest date"});
 if(v.request_type==="standard"&&v.requested_harvest_date)ctx.addIssue({code:"custom",path:["requested_harvest_date"],message:"Unexpected preorder date"});
});
export async function createBuyerRequest(formData:FormData){
 const parsed=requestSchema.safeParse({
  listing_id:formData.get("listing_id"),quantity_requested:formData.get("quantity_requested"),
  proposed_price:formData.get("proposed_price")||"",message:formData.get("message")||"",
  buyer_name:formData.get("buyer_name"),contact_number:formData.get("contact_number"),
  fulfilment_preference:formData.get("fulfilment_preference"),delivery_location:formData.get("delivery_location")||"",
  order_instructions:formData.get("order_instructions")||"",request_type:formData.get("request_type")||"standard",
  requested_harvest_date:formData.get("requested_harvest_date")||undefined
 });
 if(!parsed.success)redirect("/marketplace?error=order_details");
 const supabase=(await createClient()) as unknown as SupabaseClient;
 const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).single();
 if(profile?.role!=="buyer")redirect("/marketplace?error=buyer_only");
 const {data:listing}=await supabase.from("produce_listings").select("quantity_available,reserved_quantity,quantity_sold,status,farmer_id,expires_at").eq("id",parsed.data.listing_id).single();
 if(!listing||listing.status!=="active"||listing.farmer_id===user.id||(listing.expires_at&&new Date(listing.expires_at)<=new Date()))redirect("/marketplace?error=unavailable");
 const available=Number(listing.quantity_available)-Number(listing.reserved_quantity)-Number(listing.quantity_sold);
 if(parsed.data.request_type==="standard"&&parsed.data.quantity_requested>available)redirect("/marketplace/"+parsed.data.listing_id+"?error=quantity");
 const {error}=await supabase.from("buyer_requests").insert({
  listing_id:parsed.data.listing_id,buyer_id:user.id,quantity_requested:parsed.data.quantity_requested,
  proposed_price:parsed.data.proposed_price??null,message:parsed.data.message||null,
  buyer_name:parsed.data.buyer_name,contact_number:parsed.data.contact_number,
  fulfilment_preference:parsed.data.fulfilment_preference,
  delivery_location:parsed.data.fulfilment_preference==="delivery"?parsed.data.delivery_location:null,
  order_instructions:parsed.data.order_instructions||null,
  request_type:parsed.data.request_type,requested_harvest_date:parsed.data.request_type==="preorder"?parsed.data.requested_harvest_date:null
 });
 if(error)redirect("/marketplace/"+parsed.data.listing_id+"?error=request");
 revalidatePath("/dashboard");redirect("/dashboard?requested=1");
}

const cartSchema=z.object({
 items:z.array(z.object({listing_id:z.string().uuid(),quantity:z.number().positive(),request_type:z.enum(["standard","preorder"]),requested_harvest_date:z.string().nullable()})).min(1).max(30),
 buyer_name:z.string().trim().min(2).max(120),contact_number:z.string().trim().min(7).max(30),
 fulfilment_preference:z.enum(["delivery","collection"]),delivery_location:z.string().trim().max(300).optional(),message:z.string().trim().max(500).optional()
});
export async function createCartRequests(formData:FormData){
 let raw:unknown;try{raw=JSON.parse(String(formData.get("items")||""));}catch{redirect("/cart?error=cart");}
 const parsed=cartSchema.safeParse({items:raw,buyer_name:formData.get("buyer_name"),contact_number:formData.get("contact_number"),fulfilment_preference:formData.get("fulfilment_preference"),delivery_location:formData.get("delivery_location")||"",message:formData.get("message")||""});
 if(!parsed.success||(parsed.data.fulfilment_preference==="delivery"&&(parsed.data.delivery_location||"").trim().length<5))redirect("/cart?error=details");
 const supabase=(await createClient()) as unknown as SupabaseClient;
 const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).single();if(profile?.role!=="buyer")redirect("/cart?error=buyer_only");
 const ids=parsed.data.items.map(x=>x.listing_id);
 if(new Set(ids).size!==ids.length)redirect("/cart?error=cart");
 const {data:listings}=await supabase.from("produce_listings").select("id,farmer_id,status,quantity_available,reserved_quantity,quantity_sold,expires_at").in("id",ids);
 if(!listings||listings.length!==ids.length)redirect("/cart?error=unavailable");
 const byId=new Map(listings.map(x=>[x.id,x]));
 for(const item of parsed.data.items){
  const listing=byId.get(item.listing_id);if(!listing||listing.farmer_id===user.id||listing.status!=="active"||(listing.expires_at&&new Date(listing.expires_at)<=new Date()))redirect("/cart?error=unavailable");
  const available=Number(listing.quantity_available)-Number(listing.reserved_quantity)-Number(listing.quantity_sold);
  if(item.request_type==="standard"&&item.quantity>available)redirect("/cart?error=quantity");
  if(item.request_type==="preorder"&&(!item.requested_harvest_date||!/^\d{4}-\d{2}-\d{2}$/.test(item.requested_harvest_date)))redirect("/cart?error=preorder");
 }
 const rows=parsed.data.items.map(item=>({listing_id:item.listing_id,buyer_id:user.id,quantity_requested:item.quantity,proposed_price:null,message:parsed.data.message||null,buyer_name:parsed.data.buyer_name,contact_number:parsed.data.contact_number,fulfilment_preference:parsed.data.fulfilment_preference,delivery_location:parsed.data.fulfilment_preference==="delivery"?parsed.data.delivery_location:null,request_type:item.request_type,requested_harvest_date:item.request_type==="preorder"?item.requested_harvest_date:null}));
 const {error}=await supabase.from("buyer_requests").insert(rows);if(error)redirect("/cart?error=request");
 revalidatePath("/dashboard");revalidatePath("/cart");redirect("/dashboard?requested=1");
}
