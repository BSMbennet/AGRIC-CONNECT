"use server";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
export async function markNotificationRead(formData:FormData){
 const id=String(formData.get("notification_id")||"");
 if(!/^[0-9a-f-]{36}$/i.test(id))return;
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();
 if(!user)return;
 await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("id",id).eq("recipient_id",user.id);
 revalidatePath("/dashboard");
}
