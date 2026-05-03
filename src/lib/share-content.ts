import { supabase } from "@/integrations/supabase/client";

export type RecipeSnapshot = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  yield_portions: number;
  dietary: string[];
};

export type IngredientSnapshot = {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  category: string | null;
  brand: string | null;
  allergens: string[];
  dietary: string[];
};

export async function snapshotRecipe(recipeId: string): Promise<RecipeSnapshot | null> {
  const { data } = await supabase
    .from("recipes")
    .select("id,name,category,description,yield_portions,dietary")
    .eq("id", recipeId)
    .maybeSingle();
  return data as RecipeSnapshot | null;
}

export async function snapshotIngredient(ingredientId: string): Promise<IngredientSnapshot | null> {
  const { data } = await supabase
    .from("ingredients")
    .select("id,name,unit,cost_per_unit,category,brand,allergens,dietary")
    .eq("id", ingredientId)
    .maybeSingle();
  return data as IngredientSnapshot | null;
}

/** Save a received ingredient snapshot into the user's own ingredients list. */
export async function saveIngredientFromSnapshot(
  userId: string,
  snap: IngredientSnapshot,
) {
  const { error } = await supabase.from("ingredients").insert({
    user_id: userId,
    name: snap.name,
    unit: snap.unit,
    cost_per_unit: snap.cost_per_unit ?? 0,
    category: snap.category ?? null,
    brand: snap.brand ?? null,
    allergens: snap.allergens ?? [],
    dietary: snap.dietary ?? [],
  });
  return error;
}
