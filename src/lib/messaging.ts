import { supabase } from "@/integrations/supabase/client";

export function pairKey(a: string, b: string) {
  return a < b ? { user_a: a, user_b: b } : { user_a: b, user_b: a };
}

export async function getOrCreateConversation(meId: string, otherId: string) {
  const { user_a, user_b } = pairKey(meId, otherId);
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_a", user_a)
    .eq("user_b", user_b)
    .maybeSingle();
  if (existing) return existing;
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_a, user_b, initiator_id: meId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function isBlocked(meId: string, otherId: string) {
  const { data } = await supabase
    .from("blocks")
    .select("blocker_id,blocked_id")
    .or(`and(blocker_id.eq.${meId},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${meId})`);
  return {
    iBlocked: !!data?.find((r) => r.blocker_id === meId),
    blockedMe: !!data?.find((r) => r.blocker_id === otherId),
  };
}

export async function blockUser(meId: string, otherId: string) {
  return supabase.from("blocks").insert({ blocker_id: meId, blocked_id: otherId });
}

export async function unblockUser(meId: string, otherId: string) {
  return supabase.from("blocks").delete().eq("blocker_id", meId).eq("blocked_id", otherId);
}
