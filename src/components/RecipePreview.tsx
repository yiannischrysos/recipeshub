import { useEffect, useMemo, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

  // Order prompt state
  const [orderPrompt, setOrderPrompt] = useState<{
    firstId: string;
    firstName: string;
  } | null>(null);
  const [promptedFor, setPromptedFor] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCurrentId(recipeId);
      setPromptedFor(null);
      setOrderPrompt(null);
    }
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
        .select("id,name,recipe_order")
        .or(`id.eq.${groupParent},parent_id.eq.${groupParent}`)
        .order("recipe_order", { ascending: true, nullsFirst: false })
        .order("name");
      if (cancelled) return;
      const sibList = (sibs ?? []).map((s) => ({ id: s.id, name: s.name }));
      setSiblings(sibList);

      // If this recipe belongs to a family with a defined order and the user
      // didn't open the first item, ask if they'd like to start from the top.
      if (
        sibList.length > 1 &&
        promptedFor !== (r.parent_id ?? r.id) &&
        sibList[0].id !== currentId
      ) {
        setOrderPrompt({ firstId: sibList[0].id, firstName: sibList[0].name });
        setPromptedFor(r.parent_id ?? r.id);
      }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <>
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-0 z-50 flex flex-col bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          >
            <DialogPrimitive.Title className="sr-only">
              {recipe?.name ?? "Recipe preview"}
            </DialogPrimitive.Title>

            {/* Sticky header with sibling nav + close */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-card/95 backdrop-blur border-b border-border px-4 py-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => prev && setCurrentId(prev.id)}
                disabled={!prev}
                className="shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-1 truncate max-w-[160px]">
                  {prev?.name ?? "Previous"}
                </span>
              </Button>
              <div className="text-xs text-muted-foreground tabular-nums">
                {siblings.length > 1 ? `${idx + 1} / ${siblings.length}` : ""}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => next && setCurrentId(next.id)}
                  disabled={!next}
                >
                  <span className="hidden sm:inline mr-1 truncate max-w-[160px]">
                    {next?.name ?? "Next"}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <DialogPrimitive.Close asChild>
                  <Button variant="ghost" size="icon" aria-label="Close preview" className="h-9 w-9">
                    <X className="h-5 w-5" />
                  </Button>
                </DialogPrimitive.Close>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              {loading || !recipe ? (
                <div className="p-10 text-center text-muted-foreground">Loading…</div>
              ) : (
                <div className="mx-auto max-w-3xl p-6 space-y-6">
                  <header>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">
                      {[recipe.family, recipe.category].filter(Boolean).join(" · ")}
                    </div>
                    <h1 className="font-display text-3xl mt-1 text-foreground">{recipe.name}</h1>
                    {recipe.description && (
                      <p className="mt-2 text-sm text-muted-foreground italic">
                        {recipe.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <DietaryChips items={recipe.dietary} />
                      <AllergenChips items={allergens} />
                    </div>
                  </header>

                  <div className="grid grid-cols-3 gap-3 rounded-xl bg-secondary/50 p-4">
                    <Stat label="Yield" value={`${recipe.yield_portions} pp`} />
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
                            <li
                              key={i}
                              className="flex items-baseline justify-between py-2 gap-3"
                            >
                              <span className="font-medium text-foreground tabular-nums shrink-0 w-24">
                                {l.quantity} {l.unit_override ?? ing?.unit ?? ""}
                              </span>
                              <span className="flex-1 text-sm text-foreground">
                                {ing?.name ?? "—"}
                                {l.ingredient_note && (
                                  <span className="text-muted-foreground ml-1">
                                    ({l.ingredient_note})
                                  </span>
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
                              <p className="text-sm text-foreground leading-relaxed">
                                {s.description}
                              </p>
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
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Recommended order prompt */}
      <AlertDialog
        open={orderPrompt !== null}
        onOpenChange={(o) => {
          if (!o) setOrderPrompt(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start from the recommended order?</AlertDialogTitle>
            <AlertDialogDescription>
              This recipe is part of a family. Would you like to start from the first recipe in
              the recommended order ("{orderPrompt?.firstName}")?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrderPrompt(null)}>
              Stay on this recipe
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (orderPrompt) setCurrentId(orderPrompt.firstId);
                setOrderPrompt(null);
              }}
            >
              Start from the top
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
