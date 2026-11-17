"use server";
import type {SupabaseClient} from "@supabase/supabase-js";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {z} from "zod";
import {createClient} from "@/lib/supabase/server";
const requestSchema=z.object({
 listing_id:z.string().uuid(),quantity_requested:z.coerce.number().positive(),
 proposed_price:z.preprocess(v=>v===""||v==null?undefined:v,z.coerce.number().min(0).optional()),
 message:z.string().trim().max(500).optional(),
 buyer_name:z.string().trim().min(2).max(120),contact_number:z.string().trim().min(7).max(30),
 fulfilment_preference:z.enum(["delivery","collection"]),delivery_location:z.string().trim().max(300).optional(),
 order_instructions:z.string().trim().max(1000).optional()
}).superRefine((v,ctx)=>{if(v.fulfilment_preference==="delivery"&&(v.delivery_location||"").trim().length<5)ctx.addIssue({code:"custom",path:["delivery_location"],message:"A delivery location is required"});});
export async function createBuyerRequest(formData:FormData){
 const parsed=requestSchema.safeParse({
  listing_id:formData.get("listing_id"),quantity_requested:formData.get("quantity_requested"),
  proposed_price:formData.get("proposed_price")||"",message:formData.get("message")||"",
  buyer_name:formData.get("buyer_name"),contact_number:formData.get("contact_number"),
  fulfilment_preference:formData.get("fulfilment_preference"),delivery_location:formData.get("delivery_location")||"",
  order_instructions:formData.get("order_instructions")||""
 });
 if(!parsed.success)redirect("/marketplace?error=order_details");
 const supabase=(await createClient()) as unknown as SupabaseClient;
 const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).single();
 if(profile?.role!=="buyer")redirect("/marketplace?error=buyer_only");
 const {data:listing}=await supabase.from("produce_listings").select("quantity_available,reserved_quantity,quantity_sold,status,farmer_id").eq("id",parsed.data.listing_id).single();
 if(!listing||listing.status!=="active"||listing.farmer_id===user.id)redirect("/marketplace?error=unavailable");
 const available=Number(listing.quantity_available)-Number(listing.reserved_quantity)-Number(listing.quantity_sold);
 if(parsed.data.quantity_requested>available)redirect("/marketplace/"+parsed.data.listing_id+"?error=quantity");
 const {error}=await supabase.from("buyer_requests").insert({
  listing_id:parsed.data.listing_id,buyer_id:user.id,quantity_requested:parsed.data.quantity_requested,
  proposed_price:parsed.data.proposed_price??null,message:parsed.data.message||null,
  buyer_name:parsed.data.buyer_name,contact_number:parsed.data.contact_number,
  fulfilment_preference:parsed.data.fulfilment_preference,
  delivery_location:parsed.data.fulfilment_preference==="delivery"?parsed.data.delivery_location:null,
  order_instructions:parsed.data.order_instructions||null
 });
 if(error)redirect("/marketplace/"+parsed.data.listing_id+"?error=request");
 revalidatePath("/dashboard");redirect("/dashboard?requested=1");
}
