import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||"";
const anonKey=process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||"";
const emailA=process.env.AGRI_AI_TEST_USER_A_EMAIL||"";
const passwordA=process.env.AGRI_AI_TEST_USER_A_PASSWORD||"";
const emailB=process.env.AGRI_AI_TEST_USER_B_EMAIL||"";
const passwordB=process.env.AGRI_AI_TEST_USER_B_PASSWORD||"";
const orderId=process.env.AGRI_AI_TEST_ORDER_ID||"";
const allocationId=process.env.AGRI_AI_TEST_ALLOCATION_ID||"";
const ledgerEntryId=process.env.AGRI_AI_TEST_LEDGER_ENTRY_ID||"";
const enabled=Boolean(url&&anonKey&&emailA&&passwordA&&emailB&&passwordB&&orderId&&allocationId&&ledgerEntryId);

describe.skipIf(!enabled)("AGRIC AI authenticated marketplace and memory RLS",()=>{
  let userA!:SupabaseClient;
  let userB!:SupabaseClient;
  let userAId="";
  let conversationId="";
  let preferenceCreated=false;

  beforeAll(async()=>{
    userA=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
    userB=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const [a,b]=await Promise.all([
      userA.auth.signInWithPassword({email:emailA,password:passwordA}),
      userB.auth.signInWithPassword({email:emailB,password:passwordB})
    ]);
    if(a.error||b.error||!a.data.user||!b.data.user)throw new Error("AGRIC AI RLS test accounts could not sign in.");
    userAId=a.data.user.id;
  });

  afterAll(async()=>{
    if(userA&&conversationId)await userA.from("agri_ai_conversations").delete().eq("id",conversationId);
    if(userA&&preferenceCreated)await userA.from("agri_ai_memory_preferences").delete().eq("user_id",userAId);
    if(userA)await userA.auth.signOut();
    if(userB)await userB.auth.signOut();
  });

  it("keeps the explicit memory-consent preference private to its owner",async()=>{
    const saved=await userA.from("agri_ai_memory_preferences").upsert({user_id:userAId,enabled:true,consented_at:new Date().toISOString()},{onConflict:"user_id"}).select("user_id").single();
    expect(saved.error).toBeNull();preferenceCreated=true;
    const owner=await userA.from("agri_ai_memory_preferences").select("enabled").eq("user_id",userAId).single();
    expect(owner.data?.enabled).toBe(true);
    const other=await userB.from("agri_ai_memory_preferences").select("enabled").eq("user_id",userAId);
    expect(other.error).toBeNull();expect(other.data).toEqual([]);
  });

  it("allows the owner to save and read a conversation but blocks a second account",async()=>{
    const created=await userA.from("agri_ai_conversations").upsert({user_id:userAId,language:"en"},{onConflict:"user_id"}).select("id").single();
    expect(created.error).toBeNull();
    conversationId=created.data!.id;
    const inserted=await userA.from("agri_ai_messages").insert({conversation_id:conversationId,user_id:userAId,role:"user",content:"RLS isolation test"});
    expect(inserted.error).toBeNull();
    const ownerRead=await userA.from("agri_ai_messages").select("id").eq("conversation_id",conversationId);
    expect(ownerRead.data?.length).toBeGreaterThan(0);
    const otherRead=await userB.from("agri_ai_messages").select("id").eq("conversation_id",conversationId);
    expect(otherRead.error).toBeNull();
    expect(otherRead.data).toEqual([]);
    const otherDelete=await userB.from("agri_ai_conversations").delete().eq("id",conversationId).select("id");
    expect(otherDelete.data).toEqual([]);
  });

  it("keeps buyer orders, seller allocations and bookkeeping entries private to their owner",async()=>{
    const checks=[
      {table:"orders",id:orderId},
      {table:"order_allocations",id:allocationId},
      {table:"farm_bookkeeping_entries",id:ledgerEntryId}
    ];
    for(const item of checks){
      const owner=await userA.from(item.table).select("id").eq("id",item.id);
      expect(owner.error, `${item.table} owner query`).toBeNull();
      expect(owner.data?.length, `${item.table} fixture must belong to test user A`).toBe(1);
      const other=await userB.from(item.table).select("id").eq("id",item.id);
      expect(other.error, `${item.table} other-user query`).toBeNull();
      expect(other.data, `${item.table} must not leak to test user B`).toEqual([]);
    }
  });
});
