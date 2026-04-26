import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function usePresence() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let stopped = false;

    const beat = async (online: boolean) => {
      await supabase.from("user_presence").upsert({
        user_id: user.id,
        is_online: online,
        last_seen_at: new Date().toISOString(),
      });
    };

    beat(true);
    const interval = setInterval(() => { if (!stopped) beat(true); }, 30_000);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") beat(false);
      else beat(true);
    };
    const onUnload = () => { beat(false); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onUnload);
      beat(false);
    };
  }, [user]);
}
