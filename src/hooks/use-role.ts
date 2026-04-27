import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type AppRole = "admin" | "premium" | "free" | "user";

export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsAdmin(false); setLoading(false); return; }
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        setIsAdmin(!!data);
        setLoading(false);
      });
  }, [user]);

  return { isAdmin, loading };
}

// Returns the highest-tier role for the current user.
// Order: admin > premium > free.
export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setRole("free"); setLoading(false); return; }
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const roles = (data ?? []).map((r) => r.role as AppRole);
        if (roles.includes("admin")) setRole("admin");
        else if (roles.includes("premium")) setRole("premium");
        else setRole("free");
        setLoading(false);
      });
  }, [user]);

  return { role, loading };
}

export function roleLabel(role: AppRole): string {
  if (role === "admin") return "Admin";
  if (role === "premium") return "Premium";
  return "Free";
}

export function roleBadgeClass(role: AppRole): string {
  if (role === "admin") return "bg-primary/15 text-primary border-primary/30";
  if (role === "premium")
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
}
