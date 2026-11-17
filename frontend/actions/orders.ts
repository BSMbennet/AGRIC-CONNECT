"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function acceptRequest(formData: FormData) {
  const requestId = String(formData.get("request_id") || "");
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) redirect("/dashboard?error=request");
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await supabase.rpc("accept_buyer_request", { p_request_id: requestId });
  if (error || !data?.id) redirect(`/dashboard?error=${encodeURIComponent(error?.message.includes("insufficient_stock") ? "insufficient_stock" : "accept")}`);
  revalidatePath("/dashboard");
  revalidatePath("/marketplace");
  revalidatePath(`/orders/${data.id}`);
  redirect(`/orders/${data.id}`);
}

export async function rejectRequest(formData: FormData) {
  const requestId = String(formData.get("request_id") || "");
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) redirect("/dashboard?error=request");
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("reject_buyer_request", { p_request_id: requestId });
  if (error) redirect("/dashboard?error=reject");
  revalidatePath("/dashboard");
  redirect("/dashboard?rejected=1");
}

export async function fulfillAllocation(formData: FormData) {
  const allocationId = String(formData.get("allocation_id") || "");
  if (!/^[0-9a-f-]{36}$/i.test(allocationId)) redirect("/dashboard?error=allocation");
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await supabase.rpc("fulfill_order_allocation", { p_allocation_id: allocationId });
  if (error || !data?.id) redirect("/dashboard?error=fulfill");
  revalidatePath("/dashboard");
  revalidatePath("/marketplace");
  revalidatePath(`/orders/${data.id}`);
  redirect(`/orders/${data.id}`);
}


export async function addOrderComment(formData: FormData) {
  const orderId=String(formData.get("order_id")||"");
  const body=String(formData.get("body")||"").trim();
  if(!/^[0-9a-f-]{36}$/i.test(orderId)||body.length<1||body.length>2000) redirect("/dashboard?error=comment");
  const supabase=(await createClient()) as unknown as SupabaseClient;
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect("/login");
  const {error}=await supabase.from("order_comments").insert({order_id:orderId,author_id:user.id,body});
  if(error) redirect("/orders/"+orderId+"?error=comment");
  revalidatePath("/orders/"+orderId);
  redirect("/orders/"+orderId+"#conversation");
}


export async function updateBuyerOrderDetails(formData: FormData) {
  const orderId=String(formData.get("order_id")||"");
  const buyerName=String(formData.get("buyer_name")||"").trim();
  const contact=String(formData.get("buyer_contact_number")||"").trim();
  const preference=String(formData.get("fulfilment_preference")||"");
  const location=String(formData.get("delivery_location")||"").trim();
  const instructions=String(formData.get("order_instructions")||"").trim();
  if(!/^[0-9a-f-]{36}$/i.test(orderId)||buyerName.length<2||buyerName.length>120||contact.length<7||contact.length>30||!["delivery","collection"].includes(preference)||(preference==="delivery"&&location.length<5)||instructions.length>1000) redirect("/orders/"+orderId+"?error=order_details");
  const supabase=(await createClient()) as unknown as SupabaseClient;
  const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
  const {error}=await supabase.rpc("update_buyer_order_details",{p_order_id:orderId,p_buyer_name:buyerName,p_contact_number:contact,p_fulfilment_preference:preference,p_delivery_location:location,p_order_instructions:instructions});
  if(error)redirect("/orders/"+orderId+"?error=order_details");
  revalidatePath("/orders/"+orderId);revalidatePath("/dashboard");
  redirect("/orders/"+orderId+"?updated=1");
}
