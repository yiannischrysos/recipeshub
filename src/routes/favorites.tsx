import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/use-favorites";
import { FavoriteStar } from "@/components/FavoriteStar";
import { Star, ChefHat, Carrot } from "lucide-react";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/favorites")({
  component: FavoritesPage,
});

type RecipeRow = { id: string; name: string; category: string | null };
type IngRow = { id: string; name: string; unit: string; cost_per_unit: number };

function FavoritesPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const recipeFavs = useFavorites("recipe");
  const ingFavs = useFavorites("ingredient");
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [ings, setIngs] = useState<IngRow[]>([]);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [loading, user, nav]);

  useEffect(() => {
    if (!user) return;
    supabase.from("recipes").select("id,name,category").order("name")
      .then(({ data }) => setRecipes((data ?? []) as RecipeRow[]));
    supabase.from("ingredients").select("id,name,unit,cost_per_unit").order("name")
      .then(({ data }) => setIngs((data ?? []) as IngRow[]));
  }, [user]);

  if (!user) return <div className="min-h-screen bg-background"><AppHeader /></div>;

  const favRecipes = recipes.filter((r) => recipeFavs.isFavorite(r.id));
  const favIngs = ings.filter((i) => ingFavs.isFavorite(i.id));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-10">
        <header>
          <h1 className="font-display text-4xl flex items-center gap-2">
            <Star className="h-7 w-7 fill-amber-400 text-amber-500" /> Favorites
          </h1>
          <p className="text-muted-foreground mt-1">Your starred recipes and ingredients in one place.</p>
        </header>

        <section>
          <h2 className="font-display text-2xl mb-3 flex items-center gap-2">
            <ChefHat className="h-5 w-5" /> Recipes
            <span className="text-sm text-muted-foreground font-sans">({favRecipes.length})</span>
          </h2>
          {favRecipes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
              No favorite recipes yet — tap the star on any recipe to save it here.
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {favRecipes.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 hover:bg-secondary/30">
                  <FavoriteStar active onToggle={() => recipeFavs.toggle(r.id)} />
                  <Link to="/recipes/$id" params={{ id: r.id }} className="flex-1 min-w-0">
                    <div className="font-medium truncate">{r.name}</div>
                    {r.category && <div className="text-xs text-muted-foreground">{r.category}</div>}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-display text-2xl mb-3 flex items-center gap-2">
            <Carrot className="h-5 w-5" /> Ingredients
            <span className="text-sm text-muted-foreground font-sans">({favIngs.length})</span>
          </h2>
          {favIngs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
              No favorite ingredients yet.
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {favIngs.map((i) => (
                <div key={i.id} className="flex items-center gap-3 p-3 hover:bg-secondary/30">
                  <FavoriteStar active onToggle={() => ingFavs.toggle(i.id)} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{i.name}</div>
                  </div>
                  <div className="text-sm tabular-nums text-muted-foreground">
                    {fmtMoney(Number(i.cost_per_unit))} / {i.unit}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
