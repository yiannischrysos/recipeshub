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
import { ArrowLeft, Plus, Trash2, Save, ExternalLink, GripVertical, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney, fmtNum } from "@/lib/format";
import { ALLERGENS, DIETARY, ALLERGEN_EMOJI, DIETARY_EMOJI } from "@/lib/taxonomy";
import { AllergenChips, DietaryChips } from "@/components/Chips";
import { downloadRecipePdf } from "@/lib/recipe-pdf";
import { RecipePreview } from "@/components/RecipePreview";

export const Route = createFileRoute("/recipes/$id")({
  component: RecipeDetail,
});

type Ingredient = {
  id: string; name: string; unit: string; cost_per_unit: number;
  allergens: string[]; dietary: string[];
};
type Line = {
  id?: string;
  ingredient_id: string;
  quantity: number;
  unit_override: string | null;
  ingredient_note: string | null;
  position: number;
};
type Step = {
  id?: string;
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
  source: string | null;
  source_url: string | null;
};

const TIME_UNITS = ["Second(s)", "Minute(s)", "Hour(s)"];

function RecipeDetail() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [loading, user, nav]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingData(true);
      const [r, ing, ri, st] = await Promise.all([
        supabase.from("recipes").select("*").eq("id", id).single(),
        supabase.from("ingredients").select("id,name,unit,cost_per_unit,allergens,dietary").order("name"),
        supabase.from("recipe_ingredients").select("*").eq("recipe_id", id).order("position"),
        supabase.from("recipe_steps").select("*").eq("recipe_id", id).order("step_number"),
      ]);
      if (r.error) { toast.error(r.error.message); nav({ to: "/recipes" }); return; }
      setRecipe(r.data as Recipe);
      setIngredients((ing.data ?? []) as Ingredient[]);
      setLines((ri.data ?? []).map((l: { id: string; ingredient_id: string; quantity: number; unit_override: string | null; ingredient_note: string | null; position: number }) => ({
        id: l.id, ingredient_id: l.ingredient_id, quantity: Number(l.quantity),
        unit_override: l.unit_override, ingredient_note: l.ingredient_note, position: l.position,
      })));
      setSteps((st.data ?? []).map((s: { id: string; step_number: number; description: string; estimated_time: number | null; time_unit: string | null; degrees: string | null }) => ({
        id: s.id, step_number: s.step_number, description: s.description,
        estimated_time: s.estimated_time, time_unit: s.time_unit, degrees: s.degrees,
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

  // Aggregate allergens from used ingredients
  const allergenSet = useMemo(() => {
    const s = new Set<string>();
    lines.forEach((l) => ingMap[l.ingredient_id]?.allergens?.forEach((a) => s.add(a)));
    return Array.from(s);
  }, [lines, ingMap]);

  const updateRecipe = (patch: Partial<Recipe>) => setRecipe((r) => (r ? { ...r, ...patch } : r));

  const addLine = () => {
    if (ingredients.length === 0) return toast.error("Add ingredients first.");
    setLines((ls) => [...ls, {
      ingredient_id: ingredients[0].id, quantity: 0,
      unit_override: null, ingredient_note: null, position: ls.length,
    }]);
  };
  const removeLine = (idx: number) => setLines((ls) => ls.filter((_, i) => i !== idx));

  const addStep = () =>
    setSteps((ss) => [...ss, { step_number: ss.length + 1, description: "", estimated_time: null, time_unit: null, degrees: null }]);
  const removeStep = (idx: number) => setSteps((ss) => ss.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_number: i + 1 })));

  const saveAll = async () => {
    if (!recipe) return;
    setBusy(true);
    const { error: rErr } = await supabase.from("recipes").update({
      name: recipe.name, family: recipe.family, category: recipe.category,
      description: recipe.description, yield_portions: recipe.yield_portions,
      margin_pct: recipe.margin_pct, dietary: recipe.dietary,
      source: recipe.source, source_url: recipe.source_url,
    }).eq("id", recipe.id);
    if (rErr) { setBusy(false); return toast.error(rErr.message); }

    // Replace lines
    const { error: dLErr } = await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipe.id);
    if (dLErr) { setBusy(false); return toast.error(dLErr.message); }
    if (lines.length > 0) {
      const payload = lines.map((l, i) => ({
        recipe_id: recipe.id,
        ingredient_id: l.ingredient_id,
        quantity: Number(l.quantity) || 0,
        unit_override: l.unit_override,
        ingredient_note: l.ingredient_note,
        position: i,
      }));
      const { error } = await supabase.from("recipe_ingredients").insert(payload);
      if (error) { setBusy(false); return toast.error(error.message); }
    }

    // Replace steps
    const { error: dSErr } = await supabase.from("recipe_steps").delete().eq("recipe_id", recipe.id);
    if (dSErr) { setBusy(false); return toast.error(dSErr.message); }
    if (steps.length > 0) {
      const payload = steps.filter((s) => s.description.trim()).map((s, i) => ({
        recipe_id: recipe.id,
        step_number: i + 1,
        description: s.description,
        estimated_time: s.estimated_time,
        time_unit: s.time_unit,
        degrees: s.degrees,
      }));
      if (payload.length > 0) {
        const { error } = await supabase.from("recipe_steps").insert(payload);
        if (error) { setBusy(false); return toast.error(error.message); }
      }
    }

    setBusy(false);
    toast.success("Recipe saved");
  };

  const toggleDietary = (d: string) => {
    if (!recipe) return;
    updateRecipe({ dietary: recipe.dietary.includes(d) ? recipe.dietary.filter((x) => x !== d) : [...recipe.dietary, d] });
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
        <div className="space-y-6">
          {/* Header */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Recipe name</Label>
                <Input value={recipe.name} onChange={(e) => updateRecipe({ name: e.target.value })}
                  className="font-display text-2xl h-12" />
              </div>
              <div className="space-y-2">
                <Label>Family (groups sub-recipes)</Label>
                <Input value={recipe.family ?? ""} onChange={(e) => updateRecipe({ family: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={recipe.category ?? ""} onChange={(e) => updateRecipe({ category: e.target.value })}
                  placeholder="Cake, Bread, Pastry…" />
              </div>
              <div className="space-y-2">
                <Label>Yield (portions)</Label>
                <Input type="number" min="0" value={recipe.yield_portions}
                  onChange={(e) => updateRecipe({ yield_portions: Math.max(0, Number(e.target.value) || 0) })} />
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Input value={recipe.source ?? ""} onChange={(e) => updateRecipe({ source: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Source URL</Label>
                <div className="flex gap-2">
                  <Input value={recipe.source_url ?? ""} onChange={(e) => updateRecipe({ source_url: e.target.value })} placeholder="https://…" />
                  {recipe.source_url && (
                    <Button variant="outline" size="icon" asChild>
                      <a href={recipe.source_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Description</Label>
                <Textarea rows={2} value={recipe.description ?? ""} onChange={(e) => updateRecipe({ description: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dietary</Label>
              <div className="flex flex-wrap gap-1.5">
                {DIETARY.map((d) => {
                  const on = recipe.dietary.includes(d);
                  return (
                    <button key={d} type="button" onClick={() => toggleDietary(d)}
                      className={`text-xs rounded-full px-2.5 py-1 border transition ${on ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary"}`}>
                      {DIETARY_EMOJI[d]} {d}
                    </button>
                  );
                })}
              </div>
            </div>

            {allergenSet.length > 0 && (
              <div className="space-y-2">
                <Label>Detected allergens (from ingredients)</Label>
                <AllergenChips items={allergenSet} />
              </div>
            )}
          </div>

          {/* Ingredients */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Ingredients</h2>
              <Button size="sm" variant="outline" onClick={addLine}>
                <Plus className="h-4 w-4 mr-1" /> Add line
              </Button>
            </div>
            {ingredients.length === 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                No ingredients in your library yet.{" "}
                <Link to="/ingredients" className="text-primary underline">Add some first.</Link>
              </p>
            )}
            {lines.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">No ingredients in this recipe yet.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {lines.map((l, idx) => {
                  const ing = ingMap[l.ingredient_id];
                  const cost = (Number(l.quantity) || 0) * Number(ing?.cost_per_unit ?? 0);
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <Select value={l.ingredient_id}
                          onValueChange={(v) => setLines((ls) => ls.map((x, i) => (i === idx ? { ...x, ingredient_id: v } : x)))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ingredients.map((i) => (
                              <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input value={l.ingredient_note ?? ""} placeholder="[note]"
                          onChange={(e) => setLines((ls) => ls.map((x, i) => (i === idx ? { ...x, ingredient_note: e.target.value || null } : x)))}
                          className="text-xs" />
                      </div>
                      <div className="col-span-2">
                        <Input type="number" step="0.01" min="0" value={l.quantity}
                          onChange={(e) => setLines((ls) => ls.map((x, i) => (i === idx ? { ...x, quantity: Number(e.target.value) } : x)))}
                          className="text-right" />
                      </div>
                      <div className="col-span-2 text-xs text-muted-foreground truncate">
                        {l.unit_override ?? ing?.unit ?? ""}
                        <div className="text-right text-foreground tabular-nums text-sm">{fmtMoney(cost)}</div>
                      </div>
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

          {/* Method */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Method</h2>
              <Button size="sm" variant="outline" onClick={addStep}>
                <Plus className="h-4 w-4 mr-1" /> Add step
              </Button>
            </div>
            {steps.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">No method steps yet.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {steps.map((s, idx) => (
                  <li key={idx} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-1 pt-3 text-right text-sm font-display text-primary">{idx + 1}.</div>
                    <div className="col-span-7">
                      <Textarea rows={2} value={s.description}
                        onChange={(e) => setSteps((ss) => ss.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))} />
                    </div>
                    <div className="col-span-1">
                      <Input type="number" min="0" placeholder="time" value={s.estimated_time ?? ""}
                        onChange={(e) => setSteps((ss) => ss.map((x, i) => (i === idx ? { ...x, estimated_time: e.target.value === "" ? null : Number(e.target.value) } : x)))} />
                    </div>
                    <div className="col-span-2">
                      <Select value={s.time_unit ?? "—"}
                        onValueChange={(v) => setSteps((ss) => ss.map((x, i) => (i === idx ? { ...x, time_unit: v === "—" ? null : v } : x)))}>
                        <SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="—">—</SelectItem>
                          {TIME_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input className="mt-2" placeholder="160°C" value={s.degrees ?? ""}
                        onChange={(e) => setSteps((ss) => ss.map((x, i) => (i === idx ? { ...x, degrees: e.target.value || null } : x)))} />
                    </div>
                    <div className="col-span-1 text-right pt-1">
                      <Button size="icon" variant="ghost" onClick={() => removeStep(idx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 sticky top-20">
            <h3 className="font-display text-xl">Costing</h3>
            <div className="mt-4 space-y-3">
              <Row label="Total recipe cost" value={fmtMoney(totalCost)} />
              <Row label={`Cost per portion (×${portions})`} value={fmtMoney(perPortion)} />
            </div>
            <div className="mt-6 space-y-2">
              <Label>Target margin %</Label>
              <Input type="number" min="0" max="99" step="1" value={recipe.margin_pct}
                onChange={(e) => updateRecipe({ margin_pct: Number(e.target.value) })} />
              <p className="text-xs text-muted-foreground">Food cost = {fmtNum(100 - margin, 0)}% of selling price.</p>
            </div>
            <div className="mt-6 rounded-xl bg-primary/10 p-4">
              <div className="text-xs uppercase tracking-widest text-primary">Suggested price</div>
              <div className="font-display text-3xl text-primary mt-1">{fmtMoney(suggested)}</div>
              <div className="text-xs text-muted-foreground mt-1">Profit / portion: {fmtMoney(profit)}</div>
            </div>
            <Button className="w-full mt-6" onClick={saveAll} disabled={busy}>
              <Save className="h-4 w-4 mr-1" /> {busy ? "Saving…" : "Save recipe"}
            </Button>
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() =>
                downloadRecipePdf({
                  recipe,
                  lines,
                  steps,
                  ingMap,
                  totals: { totalCost, perPortion, suggested, profit },
                  allergens: allergenSet,
                })
              }
            >
              <Download className="h-4 w-4 mr-1" /> Download PDF
            </Button>
            <Button variant="outline" className="w-full mt-2" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-4 w-4 mr-1" /> Preview
            </Button>
          </div>
          <div className="text-xs text-muted-foreground px-1">
            <DietaryChips items={recipe.dietary} />
          </div>
        </aside>
      </div>
      <RecipePreview open={previewOpen} onOpenChange={setPreviewOpen} recipeId={recipe.id} />
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
