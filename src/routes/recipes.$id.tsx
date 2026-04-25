import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney, fmtNum } from "@/lib/format";

export const Route = createFileRoute("/recipes/$id")({
  component: RecipeDetail,
});

type Ingredient = { id: string; name: string; unit: string; cost_per_unit: number };
type Line = { id?: string; ingredient_id: string; quantity: number; position: number };
type Recipe = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  yield_portions: number;
  margin_pct: number;
};

function RecipeDetail() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingData(true);
      const [r, ing, ri] = await Promise.all([
        supabase.from("recipes").select("*").eq("id", id).single(),
        supabase.from("ingredients").select("id,name,unit,cost_per_unit").order("name"),
        supabase.from("recipe_ingredients").select("*").eq("recipe_id", id).order("position"),
      ]);
      if (r.error) { toast.error(r.error.message); nav({ to: "/recipes" }); return; }
      setRecipe(r.data as Recipe);
      setIngredients((ing.data ?? []) as Ingredient[]);
      setLines((ri.data ?? []).map((l: { id: string; ingredient_id: string; quantity: number; position: number }) => ({
        id: l.id, ingredient_id: l.ingredient_id, quantity: Number(l.quantity), position: l.position,
      })));
      setLoadingData(false);
    })();
  }, [user, id, nav]);

  const ingMap = useMemo(() => Object.fromEntries(ingredients.map((i) => [i.id, i])), [ingredients]);

  const totalCost = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * Number(ingMap[l.ingredient_id]?.cost_per_unit ?? 0), 0),
    [lines, ingMap],
  );
  const portions = recipe?.yield_portions ?? 1;
  const perPortion = portions > 0 ? totalCost / portions : 0;
  const margin = Number(recipe?.margin_pct ?? 0);
  const suggested = margin >= 100 ? perPortion : perPortion / (1 - margin / 100);
  const profit = suggested - perPortion;

  const updateRecipe = (patch: Partial<Recipe>) => setRecipe((r) => (r ? { ...r, ...patch } : r));

  const addLine = () => {
    if (ingredients.length === 0) {
      toast.error("Add ingredients first.");
      return;
    }
    setLines((ls) => [...ls, { ingredient_id: ingredients[0].id, quantity: 0, position: ls.length }]);
  };

  const removeLine = (idx: number) => setLines((ls) => ls.filter((_, i) => i !== idx));

  const saveAll = async () => {
    if (!recipe) return;
    setBusy(true);
    const { error: rErr } = await supabase
      .from("recipes")
      .update({
        name: recipe.name,
        category: recipe.category,
        description: recipe.description,
        yield_portions: recipe.yield_portions,
        margin_pct: recipe.margin_pct,
      })
      .eq("id", recipe.id);
    if (rErr) { setBusy(false); return toast.error(rErr.message); }

    // Replace all lines (simple + safe)
    const { error: dErr } = await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipe.id);
    if (dErr) { setBusy(false); return toast.error(dErr.message); }

    if (lines.length > 0) {
      const payload = lines.map((l, i) => ({
        recipe_id: recipe.id,
        ingredient_id: l.ingredient_id,
        quantity: Number(l.quantity) || 0,
        position: i,
      }));
      const { error: iErr } = await supabase.from("recipe_ingredients").insert(payload);
      if (iErr) { setBusy(false); return toast.error(iErr.message); }
    }
    setBusy(false);
    toast.success("Recipe saved");
  };

  if (loading || !user || loadingData || !recipe) {
    return <div className="mx-auto max-w-5xl px-6 py-10 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link to="/recipes" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> All recipes
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Recipe name</Label>
                <Input
                  value={recipe.name}
                  onChange={(e) => updateRecipe({ name: e.target.value })}
                  className="font-display text-2xl h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={recipe.category ?? ""}
                  onChange={(e) => updateRecipe({ category: e.target.value })}
                  placeholder="Cake, Bread, Pastry…"
                />
              </div>
              <div className="space-y-2">
                <Label>Yield (portions)</Label>
                <Input
                  type="number" min="1"
                  value={recipe.yield_portions}
                  onChange={(e) => updateRecipe({ yield_portions: Math.max(1, Number(e.target.value) || 1) })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Description / method (optional)</Label>
                <Textarea
                  rows={3}
                  value={recipe.description ?? ""}
                  onChange={(e) => updateRecipe({ description: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Ingredients</h2>
              <Button size="sm" variant="outline" onClick={addLine}>
                <Plus className="h-4 w-4 mr-1" /> Add line
              </Button>
            </div>

            {ingredients.length === 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                You don't have any ingredients yet.{" "}
                <Link to="/ingredients" className="text-primary underline">Add some first.</Link>
              </p>
            )}

            {lines.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">No ingredients in this recipe yet.</p>
            ) : (
              <div className="mt-4 space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs uppercase tracking-widest text-muted-foreground px-1">
                  <div className="col-span-6">Ingredient</div>
                  <div className="col-span-3 text-right">Quantity</div>
                  <div className="col-span-2 text-right">Cost</div>
                  <div className="col-span-1"></div>
                </div>
                {lines.map((l, idx) => {
                  const ing = ingMap[l.ingredient_id];
                  const cost = (Number(l.quantity) || 0) * Number(ing?.cost_per_unit ?? 0);
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <Select
                          value={l.ingredient_id}
                          onValueChange={(v) =>
                            setLines((ls) => ls.map((x, i) => (i === idx ? { ...x, ingredient_id: v } : x)))
                          }
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ingredients.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.name} ({fmtMoney(Number(i.cost_per_unit))}/{i.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number" step="0.01" min="0"
                            value={l.quantity}
                            onChange={(e) =>
                              setLines((ls) => ls.map((x, i) => (i === idx ? { ...x, quantity: Number(e.target.value) } : x)))
                            }
                            className="text-right"
                          />
                          <span className="text-xs text-muted-foreground w-8">{ing?.unit ?? ""}</span>
                        </div>
                      </div>
                      <div className="col-span-2 text-right tabular-nums text-sm">{fmtMoney(cost)}</div>
                      <div className="col-span-1 text-right">
                        <Button size="icon" variant="ghost" onClick={() => removeLine(idx)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar — costing */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 sticky top-20">
            <h3 className="font-display text-xl">Costing</h3>

            <div className="mt-4 space-y-3">
              <Row label="Total recipe cost" value={fmtMoney(totalCost)} />
              <Row label={`Cost per portion (×${portions})`} value={fmtMoney(perPortion)} />
            </div>

            <div className="mt-6 space-y-2">
              <Label>Target margin %</Label>
              <Input
                type="number" min="0" max="99" step="1"
                value={recipe.margin_pct}
                onChange={(e) => updateRecipe({ margin_pct: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Food cost = {fmtNum(100 - margin, 0)}% of selling price.
              </p>
            </div>

            <div className="mt-6 rounded-xl bg-primary/10 p-4">
              <div className="text-xs uppercase tracking-widest text-primary">Suggested price</div>
              <div className="font-display text-3xl text-primary mt-1">{fmtMoney(suggested)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Profit / portion: {fmtMoney(profit)}
              </div>
            </div>

            <Button className="w-full mt-6" onClick={saveAll} disabled={busy}>
              <Save className="h-4 w-4 mr-1" />
              {busy ? "Saving…" : "Save recipe"}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/60 pb-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-display text-lg tabular-nums">{value}</span>
    </div>
  );
}
