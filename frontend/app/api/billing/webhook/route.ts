import {createHmac,timingSafeEqual} from "node:crypto";
import {NextResponse,type NextRequest} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
type StripeSubscriptionObject={
 id?:string;mode?:string;metadata?:Record<string,string|undefined>;
 client_reference_id?:string|null;subscription?:string|null;customer?:string|null;
 status?:string;current_period_end?:number;
};
type StripeWebhookEvent={type?:string;data?:{object?:StripeSubscriptionObject}};
function verify(payload:string,header:string,secret:string){
 const fields=header.split(",").map(x=>x.split("=",2));
 const timestamp=fields.find(x=>x[0]==="t")?.[1],signatures=fields.filter(x=>x[0]==="v1").map(x=>x[1]);
 if(!timestamp||Math.abs(Date.now()/1000-Number(timestamp))>300)return false;
 const expected=createHmac("sha256",secret).update(timestamp+"."+payload).digest();
 return signatures.some(value=>{const actual=Buffer.from(value,"hex");return actual.length===expected.length&&timingSafeEqual(actual,expected);});
}
export async function POST(request:NextRequest){
 const secret=process.env.STRIPE_WEBHOOK_SECRET,url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const serviceKey=process.env.SUPABASE_SECRET_KEY,stripeApiKey=process.env.STRIPE_SECRET_KEY;
 const payload=await request.text(),signature=request.headers.get("stripe-signature")||"";
 if(!secret||!url||!serviceKey||!stripeApiKey)return NextResponse.json({error:"Webhook configuration missing"},{status:503});
 if(!verify(payload,signature,secret))return NextResponse.json({error:"Invalid signature"},{status:400});
 let event:StripeWebhookEvent;
 try{event=JSON.parse(payload) as StripeWebhookEvent;}catch{return NextResponse.json({error:"Invalid JSON"},{status:400});}
 const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}}),obj=event.data?.object;
 if(!obj)return NextResponse.json({received:true});
 if(event.type==="checkout.session.completed"&&obj.mode==="subscription"){
  const farmerId=obj.metadata?.farmer_id||obj.client_reference_id,plan=obj.metadata?.plan,subId=obj.subscription;
  if(!farmerId||!subId||(plan!=="pro"&&plan!=="premium"))return NextResponse.json({error:"Subscription metadata missing"},{status:400});
  const response=await fetch("https://api.stripe.com/v1/subscriptions/"+encodeURIComponent(subId),{headers:{Authorization:"Bearer "+stripeApiKey},cache:"no-store"});
  const sub=await response.json() as {status:string;current_period_end:number};
  if(!response.ok)return NextResponse.json({error:"Unable to verify subscription"},{status:502});
  const {error}=await db.from("farmer_subscriptions").upsert({farmer_id:farmerId,plan,status:sub.status,stripe_customer_id:String(obj.customer||""),stripe_subscription_id:subId,current_period_end:new Date(sub.current_period_end*1000).toISOString(),updated_at:new Date().toISOString()},{onConflict:"stripe_subscription_id"});
  if(error)return NextResponse.json({error:"Subscription persistence failed"},{status:500});
 }else if(event.type==="customer.subscription.updated"||event.type==="customer.subscription.deleted"){
  const farmerId=obj.metadata?.farmer_id,plan=obj.metadata?.plan;
  if(farmerId&&(plan==="pro"||plan==="premium")&&obj.id){
   const {error}=await db.from("farmer_subscriptions").upsert({farmer_id:farmerId,plan,status:event.type==="customer.subscription.deleted"?"canceled":obj.status||"incomplete",stripe_customer_id:String(obj.customer||""),stripe_subscription_id:obj.id,current_period_end:obj.current_period_end?new Date(obj.current_period_end*1000).toISOString():null,updated_at:new Date().toISOString()},{onConflict:"stripe_subscription_id"});
   if(error)return NextResponse.json({error:"Subscription update failed"},{status:500});
  }
 }
 return NextResponse.json({received:true});
}
