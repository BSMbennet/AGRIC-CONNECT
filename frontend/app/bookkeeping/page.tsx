import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { addBookkeepingEntry, deleteBookkeepingEntry, setBookkeepingPaymentStatus, updateBookkeepingEntry } from "@/actions/bookkeeping";
import { Wallet, TrendingUp, TrendingDown, Scale, Download, ReceiptText } from "lucide-react";

type Entry = { id:string; entry_type:"income"|"expense"; category:string; amount:number|string; entry_date:string; description:string; entry_source:"manual"|"fulfilled_order"; payment_status:"paid"|"unpaid"; paid_at:string|null };
const money=(value:number)=>new Intl.NumberFormat("en-ZA",{style:"currency",currency:"ZAR"}).format(value);
const sum=(rows:Entry[])=>rows.reduce((total,row)=>total+Number(row.amount),0);
const validDate=(value?:string)=>!!value&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value));

export default async function BookkeepingPage({searchParams}:{searchParams:Promise<{error?:string;saved?:string;deleted?:string;updated?:string;payment?:string;from?:string;to?:string;type?:string;status?:string}>}) {
 const params=await searchParams;
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("display_name,role").eq("id",user.id).single();
 if(profile?.role!=="farmer") redirect("/dashboard");
 let query=supabase.from("farm_bookkeeping_entries").select("id,entry_type,category,amount,entry_date,description,entry_source,payment_status,paid_at").eq("owner_id",user.id).order("entry_date",{ascending:false}).order("created_at",{ascending:false}).limit(1000);
 if(validDate(params.from)) query=query.gte("entry_date",params.from!);
 if(validDate(params.to)) query=query.lte("entry_date",params.to!);
 if(params.type==="income"||params.type==="expense") query=query.eq("entry_type",params.type);
 if(params.status==="paid"||params.status==="unpaid") query=query.eq("payment_status",params.status);
 const {data,error}=await query;
 const entries=(data??[]) as Entry[];
 const allIncome=sum(entries.filter(x=>x.entry_type==="income"));
 const allExpenses=sum(entries.filter(x=>x.entry_type==="expense"));
 const net=allIncome-allExpenses;
 const unpaidIncome=sum(entries.filter(x=>x.entry_type==="income"&&x.payment_status==="unpaid"));
 const paidIncome=sum(entries.filter(x=>x.entry_type==="income"&&x.payment_status==="paid"));
 const paidExpenses=sum(entries.filter(x=>x.entry_type==="expense"&&x.payment_status==="paid"));
 const cashPosition=paidIncome-paidExpenses;
 const now=new Date();
 const months=Array.from({length:12},(_,i)=>{
  const date=new Date(now.getFullYear(),now.getMonth()-11+i,1);
  const key=date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0");
  const rows=entries.filter(x=>x.entry_date.startsWith(key));
  return {key,label:date.toLocaleDateString("en-ZA",{month:"short"}),income:sum(rows.filter(x=>x.entry_type==="income")),expenses:sum(rows.filter(x=>x.entry_type==="expense"))};
 });
 const maxValue=Math.max(1,...months.flatMap(x=>[x.income,x.expenses]));
 const expenseCategories=Object.entries(entries.filter(x=>x.entry_type==="expense").reduce<Record<string,number>>((acc,x)=>{acc[x.category]=(acc[x.category]??0)+Number(x.amount);return acc;},{})).sort((a,b)=>b[1]-a[1]).slice(0,6);
 const maxCategory=Math.max(1,...expenseCategories.map(x=>x[1]));
 const exportParams=new URLSearchParams();
 if(validDate(params.from)) exportParams.set("from",params.from!);
 if(validDate(params.to)) exportParams.set("to",params.to!);
 if(params.type==="income"||params.type==="expense") exportParams.set("type",params.type);
 if(params.status==="paid"||params.status==="unpaid") exportParams.set("status",params.status);
 return <main className="min-h-screen agri-page"><AppNav active="bookkeeping"/><section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-leaf">Farm management</p><h1 className="mt-1 text-3xl font-bold text-forest">Farm bookkeeping</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Track your farm income, expenses, outstanding sales and cash position in one place.</p></div><a href={"/api/bookkeeping/export"+(exportParams.size?"?"+exportParams.toString():"")} className="inline-flex items-center gap-2 rounded-xl border border-emerald-900/15 bg-white px-4 py-2.5 text-sm font-semibold text-forest hover:bg-emerald-50"><Download size={16}/> Export CSV</a></div>
  {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">Your entries could not be loaded. Refresh the page or try again later.</p>}
  {params.error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{params.error==="invalid"?"Check the details and try again.":"That bookkeeping change could not be saved."}</p>}
  {(params.saved||params.deleted||params.updated||params.payment)&&<p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{params.saved?"Transaction saved.":params.deleted?"Transaction deleted.":params.updated?"Transaction updated.":"Payment status updated."}</p>}
  <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
   {[
    {label:"Income / sales",value:money(allIncome),icon:Wallet,color:"text-emerald-700"},
    {label:"Expenses",value:money(allExpenses),icon:TrendingDown,color:"text-red-600"},
    {label:"Net profit / loss",value:money(net),icon:Scale,color:net>=0?"text-emerald-700":"text-red-700"},
    {label:"Unpaid sales",value:money(unpaidIncome),icon:ReceiptText,color:"text-amber-700"},
    {label:"Cash position",value:money(cashPosition),icon:TrendingUp,color:cashPosition>=0?"text-emerald-700":"text-red-700"}
   ].map(card=>{const Icon=card.icon;return <article key={card.label} className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm"><Icon className={card.color} size={20}/><p className="mt-3 text-xs text-slate-500">{card.label}</p><p className="mt-1 break-words text-xl font-bold text-forest">{card.value}</p></article>;})}
  </div>
  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">Sales from fulfilled orders are added automatically as unpaid. Mark them paid only after you receive the money. Profit is based on recorded sales less recorded expenses; cash position counts only entries marked paid. This is a management ledger, not a bank statement or tax filing.</div>
  <div className="mt-7 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
   <section className="rounded-2xl border border-emerald-900/10 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-forest">Income vs expenses</h2><p className="mt-1 text-xs text-slate-500">Last 12 months · ZAR</p></div><div className="flex gap-4 text-xs text-slate-600"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded bg-emerald-600"/>Income</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded bg-orange-400"/>Expenses</span></div></div>
    <div className="mt-6 grid grid-cols-12 gap-1.5 sm:gap-3">{months.map(month=><div key={month.key} className="min-w-0"><div className="flex h-40 items-end justify-center gap-0.5 border-b border-slate-200 px-0.5 sm:gap-1">{[{v:month.income,c:"bg-emerald-600",label:"Income"},{v:month.expenses,c:"bg-orange-400",label:"Expenses"}].map(bar=><div key={bar.label} title={bar.label+": "+money(bar.v)} className={"w-full max-w-4 rounded-t-sm sm:max-w-7 "+bar.c} style={{height:bar.v>0?Math.max(3,bar.v/maxValue*100)+"%":"0%"}}/>)}</div><p className="mt-2 truncate text-center text-[10px] font-semibold text-slate-500 sm:text-xs">{month.label}</p></div>)}</div>
    {!entries.length&&<p className="mt-4 text-sm text-slate-500">Your financial chart will populate as transactions are recorded.</p>}
   </section>
   <section className="rounded-2xl border border-emerald-900/10 bg-white p-5"><h2 className="font-bold text-forest">Expense breakdown</h2><p className="mt-1 text-xs text-slate-500">Top spending categories</p>{expenseCategories.length?<div className="mt-5 space-y-4">{expenseCategories.map(([category,value])=><div key={category}><div className="mb-1 flex justify-between gap-3 text-xs"><span className="truncate font-semibold text-slate-700">{category}</span><span className="font-semibold text-forest">{money(value)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-400" style={{width:(value/maxCategory*100)+"%"}}/></div></div>)}</div>:<p className="mt-5 text-sm text-slate-500">Add expenses to see where your farm spends the most.</p>}</section>
  </div>
  <div className="mt-7 grid items-start gap-5 xl:grid-cols-[0.78fr_1.22fr]">
   <section className="rounded-2xl border border-emerald-900/10 bg-white p-5"><h2 className="text-lg font-bold text-forest">Record a transaction</h2><p className="mt-1 text-xs text-slate-500">Record sales, harvest income, inputs, labour, transport and other costs.</p><form action={addBookkeepingEntry} className="mt-4 space-y-3">
    <label className="block text-xs font-semibold text-slate-700">Type<select name="entry_type" required className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="income">Income</option><option value="expense">Expense</option></select></label>
    <label className="block text-xs font-semibold text-slate-700">Category<input name="category" required minLength={2} maxLength={60} placeholder="e.g. Tomato sales, fertiliser, labour" className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label>
    <label className="block text-xs font-semibold text-slate-700">Amount (R)<input name="amount" type="number" required min="0.01" max="9999999999.99" step="0.01" placeholder="0.00" className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label>
    <label className="block text-xs font-semibold text-slate-700">Transaction date<input name="entry_date" type="date" required defaultValue={now.toLocaleDateString("en-CA",{timeZone:"Africa/Johannesburg"})} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label>
    <label className="block text-xs font-semibold text-slate-700">Payment status<select name="payment_status" className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="paid">Paid / received</option><option value="unpaid">Unpaid / outstanding</option></select></label>
    <label className="block text-xs font-semibold text-slate-700">Notes<textarea name="description" maxLength={500} rows={3} placeholder="Optional details or reference" className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm"/></label>
    <button className="w-full rounded-xl bg-forest px-4 py-3 text-sm font-bold text-white hover:bg-leaf">Save transaction</button>
   </form></section>
   <section className="min-w-0 rounded-2xl border border-emerald-900/10 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-forest">Transaction ledger</h2><p className="mt-1 text-xs text-slate-500">{entries.length} matching entries (up to 1,000 loaded)</p></div></div>
    <form method="get" className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-5"><label className="text-[11px] font-semibold text-slate-600">From<input type="date" name="from" defaultValue={params.from} className="mt-1 h-9 w-full rounded border border-slate-200 bg-white px-2 text-xs"/></label><label className="text-[11px] font-semibold text-slate-600">To<input type="date" name="to" defaultValue={params.to} className="mt-1 h-9 w-full rounded border border-slate-200 bg-white px-2 text-xs"/></label><label className="text-[11px] font-semibold text-slate-600">Type<select name="type" defaultValue={params.type??""} className="mt-1 h-9 w-full rounded border border-slate-200 bg-white px-2 text-xs"><option value="">All types</option><option value="income">Income</option><option value="expense">Expense</option></select></label><label className="text-[11px] font-semibold text-slate-600">Payment<select name="status" defaultValue={params.status??""} className="mt-1 h-9 w-full rounded border border-slate-200 bg-white px-2 text-xs"><option value="">All statuses</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option></select></label><div className="flex items-end gap-2"><button className="h-9 flex-1 rounded-lg bg-forest px-3 text-xs font-bold text-white">Filter</button><a href="/bookkeeping" className="pb-2 text-xs text-slate-500 underline">Clear</a></div></form>
    {entries.length?<div className="mt-3 divide-y divide-slate-100">{entries.map(entry=><article key={entry.id} className="py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-forest">{entry.category}</p>{entry.entry_source==="fulfilled_order"&&<span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Order sale</span>}</div><p className="mt-1 text-xs text-slate-500">{new Date(entry.entry_date+"T12:00:00").toLocaleDateString("en-ZA")}{entry.description?" · "+entry.description:""}</p></div><div className="text-right"><p className={"whitespace-nowrap text-sm font-bold "+(entry.entry_type==="income"?"text-emerald-700":"text-red-700")}>{entry.entry_type==="income"?"+":"−"}{money(Number(entry.amount))}</p><p className={"mt-1 text-[10px] font-semibold "+(entry.payment_status==="paid"?"text-emerald-700":"text-amber-700")}>{entry.payment_status==="paid"?"Paid":"Unpaid"}</p></div></div>
     <div className="mt-3 flex flex-wrap items-center gap-3">{entry.entry_source==="manual"?<details className="text-xs"><summary className="cursor-pointer font-semibold text-forest underline">Edit entry</summary><form action={updateBookkeepingEntry} className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2"><input type="hidden" name="entry_id" value={entry.id}/><label className="text-[11px] text-slate-600">Category<input name="category" required minLength={2} maxLength={60} defaultValue={entry.category} className="mt-1 h-9 w-full rounded border border-slate-200 bg-white px-2 text-xs"/></label><label className="text-[11px] text-slate-600">Amount (R)<input name="amount" type="number" min="0.01" step="0.01" required defaultValue={Number(entry.amount).toFixed(2)} className="mt-1 h-9 w-full rounded border border-slate-200 bg-white px-2 text-xs"/></label><label className="text-[11px] text-slate-600">Date<input name="entry_date" type="date" required defaultValue={entry.entry_date} className="mt-1 h-9 w-full rounded border border-slate-200 bg-white px-2 text-xs"/></label><label className="text-[11px] text-slate-600">Notes<input name="description" maxLength={500} defaultValue={entry.description} className="mt-1 h-9 w-full rounded border border-slate-200 bg-white px-2 text-xs"/></label><button className="rounded-lg bg-forest px-3 py-2 text-xs font-bold text-white sm:col-span-2">Save changes</button></form></details>:<span className="text-[11px] text-slate-400">Linked to fulfilled order</span>}
      <form action={setBookkeepingPaymentStatus} className="flex items-center gap-1"><input type="hidden" name="entry_id" value={entry.id}/><input type="hidden" name="payment_status" value={entry.payment_status==="paid"?"unpaid":"paid"}/><button className="text-xs font-semibold text-forest underline">{entry.payment_status==="paid"?"Mark unpaid":"Mark paid"}</button></form>
      {entry.entry_source==="manual"&&<form action={deleteBookkeepingEntry}><input type="hidden" name="entry_id" value={entry.id}/><button className="text-xs text-red-600 underline">Delete</button></form>}
     </div></article>)}</div>:<p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">No transactions match these filters. Add a transaction or clear the filters.</p>}
   </section>
  </div>
 </section></main>;
}
