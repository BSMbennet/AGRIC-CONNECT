"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function acceptRequest(formData: FormData) {
  const requestId = String(formData.get("request_id") || "");
  const method = String(formData.get("fulfilment_method") || "");
  const startValue = String(formData.get("scheduled_start") || "");
  const endValue = String(formData.get("scheduled_end") || "");
  const location = String(formData.get("fulfilment_location") || "").trim();
  const instructions = String(formData.get("seller_instructions") || "").trim();
  const fee = Number(formData.get("delivery_fee") || 0);
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !["delivery", "collection"].includes(method) ||
      !/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$/.test(startValue) ||
      (endValue && !/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$/.test(endValue)) ||
      location.length < 3 || location.length > 300 || instructions.length > 1000 ||
      !Number.isFinite(fee) || fee < 0 || (method === "collection" && fee !== 0)) redirect("/dashboard?error=schedule");
  const start = new Date(startValue + ":00+02:00");
  const end = endValue ? new Date(endValue + ":00+02:00") : null;
  if (Number.isNaN(start.getTime()) || start <= new Date() || (end && (Number.isNaN(end.getTime()) || end <= start))) redirect("/dashboard?error=schedule");
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await supabase.rpc("accept_buyer_request_with_schedule", {
    p_request_id: requestId,
    p_fulfilment_method: method,
    p_scheduled_start: start.toISOString(),
    p_scheduled_end: end?.toISOString() ?? null,
    p_fulfilment_location: location,
    p_seller_instructions: instructions,
    p_delivery_fee: fee,
  });
  if (error || !data?.id) {
    const reason = error?.message.includes("insufficient_stock") ? "insufficient_stock" : "accept";
    redirect("/dashboard?error=" + reason);
  }
  revalidatePath("/dashboard");
  revalidatePath("/marketplace");
  revalidatePath("/orders/" + data.id);
  redirect("/orders/" + data.id + "?accepted=1");
}

export async function rejectRequest(formData: FormData) {
  const requestId = String(formData.get("request_id") || "");
  const reason = String(formData.get("rejection_reason") || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || reason.length < 3 || reason.length > 500) redirect("/dashboard?error=rejection");
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("reject_buyer_request_with_reason", { p_request_id: requestId, p_reason: reason });
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

export async function updateOrderFulfilmentSchedule(formData: FormData) {
  const orderId = String(formData.get("order_id") || "");
  const method = String(formData.get("fulfilment_method") || "");
  const startValue = String(formData.get("scheduled_start") || "");
  const endValue = String(formData.get("scheduled_end") || "");
  const location = String(formData.get("fulfilment_location") || "").trim();
  const instructions = String(formData.get("seller_instructions") || "").trim();
  const fee = Number(formData.get("delivery_fee") || 0);
  if (!/^[0-9a-f-]{36}$/i.test(orderId) || !["delivery", "collection"].includes(method) ||
      !/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$/.test(startValue) ||
      (endValue && !/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$/.test(endValue)) ||
      location.length < 3 || location.length > 300 || instructions.length > 1000 ||
      !Number.isFinite(fee) || fee < 0 || (method === "collection" && fee !== 0)) redirect("/orders/" + orderId + "?error=schedule");
  const start = new Date(startValue + ":00+02:00");
  const end = endValue ? new Date(endValue + ":00+02:00") : null;
  if (Number.isNaN(start.getTime()) || start <= new Date() || (end && (Number.isNaN(end.getTime()) || end <= start))) redirect("/orders/" + orderId + "?error=schedule");
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("update_order_fulfilment_schedule", {
    p_order_id: orderId, p_fulfilment_method: method, p_scheduled_start: start.toISOString(),
    p_scheduled_end: end?.toISOString() ?? null, p_fulfilment_location: location,
    p_seller_instructions: instructions, p_delivery_fee: fee,
  });
  if (error) redirect("/orders/" + orderId + "?error=schedule");
  revalidatePath("/dashboard"); revalidatePath("/orders/" + orderId);
  redirect("/orders/" + orderId + "?schedule_updated=1");
}

export async function confirmOrderDeliveryFee(formData: FormData) {
  const orderId = String(formData.get("order_id") || "");
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) redirect("/dashboard?error=order");
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("confirm_order_delivery_fee", { p_order_id: orderId });
  if (error) redirect("/orders/" + orderId + "?error=fee");
  revalidatePath("/orders/" + orderId); revalidatePath("/dashboard");
  redirect("/orders/" + orderId + "?fee_confirmed=1");
}
