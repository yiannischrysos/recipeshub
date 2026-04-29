import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

type Kind = "recipe" | "ingredient";

export function useFavorites(kind: Kind) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setIds(new Set()); setLoaded(true); return; }
    if (kind === "recipe") {
      const { data } = await supabase.from("favorite_recipes").select("recipe_id").eq("user_id", user.id);
      setIds(new Set((data ?? []).map((r) => r.recipe_id)));
    } else {
      const { data } = await supabase.from("favorite_ingredients").select("ingredient_id").eq("user_id", user.id);
      setIds(new Set((data ?? []).map((r) => r.ingredient_id)));
    }
    setLoaded(true);
  }, [user, kind]);

  useEffect(() => { load(); }, [load]);

  const toggle = useCallback(async (targetId: string) => {
    if (!user) return;
    const isFav = ids.has(targetId);
    setIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(targetId); else next.add(targetId);
      return next;
    });
    if (kind === "recipe") {
      if (isFav) {
        await supabase.from("favorite_recipes").delete()
          .eq("user_id", user.id).eq("recipe_id", targetId);
      } else {
        await supabase.from("favorite_recipes").insert({ user_id: user.id, recipe_id: targetId });
      }
    } else {
      if (isFav) {
        await supabase.from("favorite_ingredients").delete()
          .eq("user_id", user.id).eq("ingredient_id", targetId);
      } else {
        await supabase.from("favorite_ingredients").insert({ user_id: user.id, ingredient_id: targetId });
      }
    }
  }, [user, ids, kind]);

  return { ids, toggle, loaded, isFavorite: (id: string) => ids.has(id) };
}
