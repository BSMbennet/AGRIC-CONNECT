"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function createProductReview(formData:FormData){
 const orderId=String(formData.get("order_id")||"");
 const listingId=String(formData.get("listing_id")||"");
 const rating=Number(formData.get("rating"));
 const reviewText=String(formData.get("review_text")||"").trim();
 if(!/^[0-9a-f-]{36}$/i.test(orderId)||!/^[0-9a-f-]{36}$/i.test(listingId)||!Number.isInteger(rating)||rating<1||rating>5||reviewText.length<5||reviewText.length>1000)redirect("/dashboard?error=review");
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {error}=await supabase.from("product_reviews").insert({order_id:orderId,listing_id:listingId,buyer_id:user.id,rating,review_text:reviewText});
 if(error)redirect("/dashboard?error=review");
 revalidatePath(`/reviews/${listingId}`);revalidatePath("/dashboard");redirect(`/reviews/${listingId}`);
}
