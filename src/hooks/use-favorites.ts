import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

type Kind = "recipe" | "ingredient";
const TABLE: Record<Kind, "favorite_recipes" | "favorite_ingredients"> = {
  recipe: "favorite_recipes",
  ingredient: "favorite_ingredients",
};
const COL: Record<Kind, "recipe_id" | "ingredient_id"> = {
  recipe: "recipe_id",
  ingredient: "ingredient_id",
};

export function useFavorites(kind: Kind) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setIds(new Set()); setLoaded(true); return; }
    const { data } = await supabase.from(TABLE[kind]).select(COL[kind]).eq("user_id", user.id);
    setIds(new Set((data ?? []).map((r) => (r as Record<string, string>)[COL[kind]])));
    setLoaded(true);
  }, [user, kind]);

  useEffect(() => { load(); }, [load]);

  const toggle = useCallback(async (targetId: string) => {
    if (!user) return;
    const isFav = ids.has(targetId);
    // Optimistic
    setIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(targetId); else next.add(targetId);
      return next;
    });
    if (isFav) {
      await supabase.from(TABLE[kind]).delete()
        .eq("user_id", user.id).eq(COL[kind], targetId);
    } else {
      await supabase.from(TABLE[kind]).insert({
        user_id: user.id, [COL[kind]]: targetId,
      } as never);
    }
  }, [user, ids, kind]);

  return { ids, toggle, loaded, isFavorite: (id: string) => ids.has(id) };
}
