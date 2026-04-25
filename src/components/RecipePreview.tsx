import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { AllergenChips, DietaryChips } from "@/components/Chips";

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  allergens: string[];
};
type Line = {
  ingredient_id: string;
  quantity: number;
  unit_override: string | null;
  ingredient_note: string | null;
  position: number;
};
type Step = {
  step_number: number;
  description: string;
  estimated_time: number | null;
  time_unit: string | null;
  degrees: string | null;
};
type Recipe = {
  id: string;
  name: string;
  family: string | null;
  category: string | null;
  description: string | null;
  yield_portions: number;
  margin_pct: number;
  dietary: string[];
  parent_id: string | null;
};

export function RecipePreview({
  open,
  onOpenChange,
  recipeId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recipeId: string;
}) {
  const [currentId, setCurrentId] = useState(recipeId);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [siblings, setSiblings] = useState<{ id: string; name: string }[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [ingMap, setIngMap] = useState<Record<string, Ingredient>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) setCurrentId(recipeId);
  }, [open, recipeId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: r } = await supabase
        .from("recipes")
        .select("*")
        .eq("id", currentId)
        .maybeSingle();
      if (!r || cancelled) return;
      setRecipe(r as Recipe);

      // Siblings: same parent (or same recipe if it's a parent itself)
      const groupParent = r.parent_id ?? r.id;
      const { data: sibs } = await supabase
        .from("recipes")
        .select("id,name")
        .or(`id.eq.${groupParent},parent_id.eq.${groupParent}`)
        .order("recipe_order", { ascending: true, nullsFirst: false })
        .order("name");
      if (cancelled) return;
      setSiblings(sibs ?? []);

      const [{ data: ri }, { data: st }] = await Promise.all([
        supabase
          .from("recipe_ingredients")
          .select("ingredient_id,quantity,unit_override,ingredient_note,position")
          .eq("recipe_id", currentId)
          .order("position"),
        supabase
          .from("recipe_steps")
          .select("step_number,description,estimated_time,time_unit,degrees")
          .eq("recipe_id", currentId)
          .order("step_number"),
      ]);
      if (cancelled) return;

      const ids = Array.from(new Set((ri ?? []).map((l) => l.ingredient_id)));
      let map: Record<string, Ingredient> = {};
      if (ids.length) {
        const { data: ing } = await supabase
          .from("ingredients")
          .select("id,name,unit,cost_per_unit,allergens")
          .in("id", ids);
        map = Object.fromEntries((ing ?? []).map((i) => [i.id, i as Ingredient]));
      }
      if (cancelled) return;
      setIngMap(map);
      setLines((ri ?? []) as Line[]);
      setSteps((st ?? []) as Step[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, currentId]);

  const totals = useMemo(() => {
    const totalCost = lines.reduce(
      (s, l) => s + (Number(l.quantity) || 0) * Number(ingMap[l.ingredient_id]?.cost_per_unit ?? 0),
      0,
    );
    const portions = recipe?.yield_portions ?? 1;
    const perPortion = portions > 0 ? totalCost / portions : 0;
    const margin = Number(recipe?.margin_pct ?? 0);
    const suggested = margin >= 100 ? perPortion : perPortion / (1 - margin / 100);
    return { totalCost, perPortion, suggested };
  }, [lines, ingMap, recipe]);

  const allergens = useMemo(() => {
    const s = new Set<string>();
    lines.forEach((l) => ingMap[l.ingredient_id]?.allergens?.forEach((a) => s.add(a)));
    return Array.from(s);
  }, [lines, ingMap]);

  const idx = siblings.findIndex((s) => s.id === currentId);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Sticky header with sibling nav */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-card/95 backdrop-blur border-b border-border px-4 py-3 pr-12">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => prev && setCurrentId(prev.id)}
            disabled={!prev}
            className="shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline ml-1 truncate max-w-[120px]">
              {prev?.name ?? "Previous"}
            </span>
          </Button>
          <div className="text-xs text-muted-foreground tabular-nums">
            {siblings.length > 1 ? `${idx + 1} / ${siblings.length}` : ""}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => next && setCurrentId(next.id)}
            disabled={!next}
            className="shrink-0"
          >
            <span className="hidden sm:inline mr-1 truncate max-w-[120px]">
              {next?.name ?? "Next"}
            </span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {loading || !recipe ? (
          <div className="p-10 text-center text-muted-foreground">Loading…</div>
        ) : (
          <div className="p-6 space-y-6">
            <header>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                {[recipe.family, recipe.category].filter(Boolean).join(" · ")}
              </div>
              <h1 className="font-display text-3xl mt-1 text-foreground">{recipe.name}</h1>
              {recipe.description && (
                <p className="mt-2 text-sm text-muted-foreground italic">{recipe.description}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <DietaryChips items={recipe.dietary} />
                <AllergenChips items={allergens} />
              </div>
            </header>

            <div className="grid grid-cols-3 gap-3 rounded-xl bg-secondary/50 p-4">
              <Stat label={`Yield`} value={`${recipe.yield_portions} pp`} />
              <Stat label="Per portion" value={fmtMoney(totals.perPortion)} />
              <Stat label="Suggested" value={fmtMoney(totals.suggested)} highlight />
            </div>

            <section>
              <h2 className="font-display text-xl mb-3">Ingredients</h2>
              {lines.length === 0 ? (
                <p className="text-sm text-muted-foreground">No ingredients.</p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {lines.map((l, i) => {
                    const ing = ingMap[l.ingredient_id];
                    return (
                      <li key={i} className="flex items-baseline justify-between py-2 gap-3">
                        <span className="font-medium text-foreground tabular-nums shrink-0 w-24">
                          {l.quantity} {l.unit_override ?? ing?.unit ?? ""}
                        </span>
                        <span className="flex-1 text-sm text-foreground">
                          {ing?.name ?? "—"}
                          {l.ingredient_note && (
                            <span className="text-muted-foreground ml-1">({l.ingredient_note})</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section>
              <h2 className="font-display text-xl mb-3">Method</h2>
              {steps.length === 0 ? (
                <p className="text-sm text-muted-foreground">No method steps.</p>
              ) : (
                <ol className="space-y-3">
                  {steps.map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="font-display text-primary text-lg shrink-0 w-7 text-right">
                        {i + 1}.
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-foreground leading-relaxed">{s.description}</p>
                        {(s.estimated_time || s.degrees) && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {s.estimated_time && s.time_unit
                              ? `${s.estimated_time} ${s.time_unit}`
                              : ""}
                            {s.estimated_time && s.degrees ? "  ·  " : ""}
                            {s.degrees ?? ""}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div
        className={`font-display text-lg tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </div>
    </div>
  );
}
