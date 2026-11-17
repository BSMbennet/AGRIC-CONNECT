"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
const categories = ["Seeds and indigenous crops","Seasonal planting","Soil and water","Pest and disease management","Food preservation","Traditional foods and uses","Weather and local indicators","Other"];
export async function createKnowledgePost(formData: FormData) {
 const title=String(formData.get("title")||"").trim(), category=String(formData.get("category")||""), content=String(formData.get("content")||"").trim();
 const crop=String(formData.get("crop_or_subject")||"").trim(), locality=String(formData.get("locality")||"").trim(), language=String(formData.get("language")||"Tshivenda").trim(), attribution=String(formData.get("attribution")||"").trim(), scope=String(formData.get("sharing_scope")||"public"), consent=formData.get("consent_to_share")==="on";
 if(title.length<4||title.length>160||content.length<30||content.length>12000||!categories.includes(category)||!["public","community"].includes(scope)||!consent) redirect("/knowledge/share?error=invalid");
 const supabase=(await createClient()) as unknown as SupabaseClient;
 const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("role,locality").eq("id",user.id).single(); if(profile?.role!=="farmer") redirect("/dashboard");
 const {error}=await supabase.from("indigenous_knowledge_posts").insert({farmer_id:user.id,title,category,content,crop_or_subject:crop||null,locality:locality||profile.locality||null,language,attribution:attribution||null,sharing_scope:scope,consent_to_share:true});
 if(error) redirect("/knowledge/share?error=save");
 revalidatePath("/knowledge"); revalidatePath("/dashboard"); redirect("/knowledge?shared=1");
}
