import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProfile, switchAccountRole } from "@/actions/profile";
import { AppNav } from "@/components/app-nav";

export default async function ProfilePage({searchParams}:{searchParams:Promise<{error?:string;saved?:string;role_updated?:string}>}){
  const params=await searchParams,supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/login");
  const {data:profile}=await supabase.from("profiles").select("display_name,role,phone_e164,locality,district,preferred_language").eq("id",user.id).single();
  if(!profile)redirect("/register?error=profile");
  const switchable=profile.role==="farmer"||profile.role==="buyer";
  return <main className="min-h-screen bg-[#f7faf7]"><AppNav active="profile"/><section className="mx-auto max-w-3xl px-5 py-10">
    <p className="text-sm font-semibold text-leaf">Account</p><h1 className="mt-2 text-3xl font-bold text-forest">Profile settings</h1>
    <p className="mt-2 text-sm text-slate-600">Update your details and choose whether you are using AgricNorthX as a buyer or a farmer/seller.</p>
    {params.saved&&<p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Your profile has been saved.</p>}
    {params.role_updated&&<p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Your account role has been changed.</p>}
    {params.error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{params.error==="switch"?"We could not change your account type. Please try again.":"We could not save those changes. Check the information and try again."}</p>}
    <form action={updateProfile} className="mt-6 grid gap-4 rounded-2xl border border-emerald-900/10 bg-white p-6 sm:grid-cols-2">
      <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Full name<input name="display_name" required minLength={2} maxLength={80} defaultValue={profile.display_name} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
      <label className="text-sm font-semibold text-slate-700">Phone number<input name="phone_e164" type="tel" maxLength={20} defaultValue={profile.phone_e164??""} placeholder="+27..." className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
      <label className="text-sm font-semibold text-slate-700">Locality / town<input name="locality" maxLength={100} defaultValue={profile.locality??""} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
      <label className="text-sm font-semibold text-slate-700">District<input name="district" required minLength={2} maxLength={100} defaultValue={profile.district??"Vhembe"} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
      <label className="text-sm font-semibold text-slate-700">Preferred language<select name="preferred_language" defaultValue={profile.preferred_language} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="en">English</option><option value="ve">Tshivenda</option><option value="ts">itsonga</option><option value="nso">Sepedi</option></select></label>
      <button className="rounded-xl bg-forest px-5 py-3 text-sm font-bold text-white sm:col-span-2">Save profile</button>
    </form>
    <section className="mt-6 rounded-2xl border border-emerald-900/10 bg-white p-6"><h2 className="text-lg font-bold text-forest">Account type</h2><p className="mt-1 text-sm text-slate-600">Current role: <strong className="capitalize">{profile.role.replaceAll("_"," ")}</strong></p>
      {switchable?<form action={switchAccountRole} className="mt-4 flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-sm font-semibold text-slate-700">Use AgricNorthX as<select name="role" defaultValue={profile.role} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="buyer">Buyer</option><option value="farmer">Farmer / seller</option></select></label><button className="h-11 rounded-xl border border-emerald-900/20 px-5 text-sm font-bold text-forest">Change account type</button></form>:<p className="mt-3 text-sm text-slate-500">This account role is managed by the AgricNorthX administrator.</p>}
      <p className="mt-3 text-xs leading-5 text-slate-500">Switching changes which buyer or farmer tools you see. It does not delete your previous listings, requests or orders. Active listings are paused when you switch from farmer to buyer; switch back to farmer to manage them. Finish or manage open transactions before switching.</p>
    </section><Link href="/dashboard" className="mt-6 inline-flex text-sm font-bold text-leaf">← Back to dashboard</Link>
  </section></main>;
}
