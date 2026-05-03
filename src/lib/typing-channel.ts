import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";

/**
 * Lightweight typing indicator using Supabase Realtime broadcast.
 * Senders call `notifyTyping()`, listeners get a Set of typing user_ids.
 */
export function useTypingChannel(channelName: string | null, meId: string | null) {
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timeoutsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!channelName || !meId) return;
    const ch = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });
    ch.on("broadcast", { event: "typing" }, ({ payload }) => {
      const uid = (payload as { user_id?: string })?.user_id;
      if (!uid || uid === meId) return;
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.add(uid);
        return next;
      });
      window.clearTimeout(timeoutsRef.current[uid]);
      timeoutsRef.current[uid] = window.setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(uid);
          return next;
        });
      }, 4000);
    });
    ch.subscribe();
    channelRef.current = ch;
    return () => {
      Object.values(timeoutsRef.current).forEach((t) => window.clearTimeout(t));
      timeoutsRef.current = {};
      supabase.removeChannel(ch);
      channelRef.current = null;
      setTypingUsers(new Set());
    };
  }, [channelName, meId]);

  const lastSentRef = useRef(0);
  const notifyTyping = () => {
    if (!channelRef.current || !meId) return;
    const now = Date.now();
    if (now - lastSentRef.current < 1500) return;
    lastSentRef.current = now;
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: meId },
    });
  };

  return { typingUsers, notifyTyping };
}
