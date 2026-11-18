import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const csv=(value:unknown)=>'"'+String(value??"").replace(/"/g,'""')+'"';
export async function GET(request:NextRequest) {
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
 const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).single();
 if(profile?.role!=="farmer") return NextResponse.json({error:"Forbidden"},{status:403});
 const params=request.nextUrl.searchParams;
 let query=supabase.from("farm_bookkeeping_entries").select("entry_date,entry_type,category,amount,payment_status,entry_source,description,related_order_id").eq("owner_id",user.id).order("entry_date",{ascending:true});
 const from=params.get("from"),to=params.get("to"),type=params.get("type"),status=params.get("status");
 if(from&&/^\d{4}-\d{2}-\d{2}$/.test(from)) query=query.gte("entry_date",from);
 if(to&&/^\d{4}-\d{2}-\d{2}$/.test(to)) query=query.lte("entry_date",to);
 if(type==="income"||type==="expense") query=query.eq("entry_type",type);
 if(status==="paid"||status==="unpaid") query=query.eq("payment_status",status);
 const rows:Record<string,unknown>[]=[];
 for(let start=0;start<50000;start+=1000){
  const {data,error}=await query.range(start,start+999);
  if(error) return NextResponse.json({error:"Could not export ledger"},{status:500});
  rows.push(...(data??[]) as Record<string,unknown>[]);
  if(!data||data.length<1000) break;
 }
 const headers=["Date","Type","Category","Amount (ZAR)","Payment status","Source","Description","Order ID"];
 const lines=[headers.map(csv).join(","),...rows.map(row=>[row.entry_date,row.entry_type,row.category,row.amount,row.payment_status,row.entry_source,row.description,row.related_order_id].map(csv).join(","))];
 return new NextResponse("\uFEFF"+lines.join("\r\n"),{headers:{
  "Content-Type":"text/csv; charset=utf-8",
  "Content-Disposition":'attachment; filename="agricnorthx-bookkeeping.csv"',
  "Cache-Control":"private, no-store",
 }});
}
