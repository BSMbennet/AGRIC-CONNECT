import { createClient } from "@/lib/supabase/server";
import { AssistantWidget } from "@/components/assistant-widget";

/** Renders the floating assistant only for signed-in users. Fails closed (renders nothing) on any error. */
export async function AssistantMount() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user ? <AssistantWidget /> : null;
  } catch {
    return null;
  }
}
