import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) return NextResponse.redirect(new URL("/login?next=/subscriptions",request.url),303);
 const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).single();
 if(profile?.role!=="farmer") return NextResponse.redirect(new URL("/dashboard",request.url),303);
 const form=await request.formData(),plan=String(form.get("plan")||"");
 if(!["pro","premium"].includes(plan)) return NextResponse.redirect(new URL("/subscriptions?error=invalid_plan",request.url),303);
 const {data:active}=await supabase.from("farmer_subscriptions").select("id").eq("farmer_id",user.id).in("status",["active","trialing"]).gt("current_period_end",new Date().toISOString()).limit(1).maybeSingle();
 if(active) return NextResponse.redirect(new URL("/subscriptions?error=already_subscribed",request.url),303);
 const secret=process.env.STRIPE_SECRET_KEY;
 const price=plan==="pro"?process.env.STRIPE_FARMER_PRO_PRICE_ID:process.env.STRIPE_FARMER_PREMIUM_PRICE_ID;
 if(!secret||!price) return NextResponse.redirect(new URL("/subscriptions?error=billing_not_configured",request.url),303);
 const origin=process.env.NEXT_PUBLIC_APP_URL||request.nextUrl.origin;
 const body=new URLSearchParams({
  mode:"subscription","line_items[0][price]":price,"line_items[0][quantity]":"1",
  success_url:origin+"/subscriptions?status=success",cancel_url:origin+"/subscriptions?status=cancelled",
  client_reference_id:user.id,"metadata[farmer_id]":user.id,"metadata[plan]":plan,
  "subscription_data[metadata][farmer_id]":user.id,"subscription_data[metadata][plan]":plan
 });
 if(user.email) body.set("customer_email",user.email);
 const response=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{Authorization:"Bearer "+secret,"Content-Type":"application/x-www-form-urlencoded"},body,cache:"no-store"});
 const session=await response.json();
 if(!response.ok||typeof session.url!=="string") {
  console.error("Stripe checkout creation failed",session?.error?.type||response.status);
  return NextResponse.redirect(new URL("/subscriptions?error=checkout_failed",request.url),303);
 }
 return NextResponse.redirect(session.url,303);
}
