import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutoTextarea } from "@/components/AutoTextarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Plus, Trash2, Save, ExternalLink, Download, Eye, Check, Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { fmtMoney, fmtNum } from "@/lib/format";
import { DIETARY, DIETARY_EMOJI } from "@/lib/taxonomy";
import { AllergenChips, DietaryChips } from "@/components/Chips";
import { downloadRecipePdf } from "@/lib/recipe-pdf";
import { RecipePreview } from "@/components/RecipePreview";
import { IngredientCombobox } from "@/components/IngredientCombobox";

export const Route = createFileRoute("/recipes/$id")({
  component: RecipeDetail,
});

type Ingredient = {
  id: string; name: string; unit: string; cost_per_unit: number;
  allergens: string[]; dietary: string[];
};
type Line = {
  uid: string;            // local stable id
  id?: string;            // db id (when persisted)
  ingredient_id: string;
  quantity: number;
  unit_override: string | null;
  ingredient_note: string | null;
  position: number;
  committed: boolean;     // row confirmed by user (✓ Save row)
};
type Step = {
  uid: string;
  id?: string;
  step_number: number;
  description: string;
  estimated_time: number | null;
  time_unit: string | null;
  degrees: string | null;
  committed: boolean;
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
const newUid = () => `tmp_${Math.random().toString(36).slice(2, 10)}`;

function RecipeDetail() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [originalRecipe, setOriginalRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [originalLines, setOriginalLines] = useState<Line[]>([]);
  const [originalSteps, setOriginalSteps] = useState<Step[]>([]);
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
      const rec = r.data as Recipe;
      setRecipe(rec); setOriginalRecipe(rec);
      setIngredients((ing.data ?? []) as Ingredient[]);
      const ls: Line[] = (ri.data ?? []).map((l: { id: string; ingredient_id: string; quantity: number; unit_override: string | null; ingredient_note: string | null; position: number }) => ({
        uid: l.id, id: l.id, ingredient_id: l.ingredient_id, quantity: Number(l.quantity),
        unit_override: l.unit_override, ingredient_note: l.ingredient_note, position: l.position,
        committed: true,
      }));
      const ss: Step[] = (st.data ?? []).map((s: { id: string; step_number: number; description: string; estimated_time: number | null; time_unit: string | null; degrees: string | null }) => ({
        uid: s.id, id: s.id, step_number: s.step_number, description: s.description,
        estimated_time: s.estimated_time, time_unit: s.time_unit, degrees: s.degrees,
        committed: true,
      }));
      setLines(ls); setOriginalLines(ls);
      setSteps(ss); setOriginalSteps(ss);
      setLoadingData(false);
    })();
  }, [user, id, nav]);

  const ingMap = useMemo(() => Object.fromEntries(ingredients.map((i) => [i.id, i])), [ingredients]);

  // Only count committed lines toward cost
  const totalCost = useMemo(
    () => lines.filter((l) => l.committed).reduce(
      (s, l) => s + (Number(l.quantity) || 0) * Number(ingMap[l.ingredient_id]?.cost_per_unit ?? 0), 0),
    [lines, ingMap],
  );
  const portions = recipe?.yield_portions ?? 1;
  const perPortion = portions > 0 ? totalCost / portions : 0;
  const margin = Number(recipe?.margin_pct ?? 0);
  const suggested = margin >= 100 ? perPortion : perPortion / (1 - margin / 100);
  const profit = suggested - perPortion;

  const allergenSet = useMemo(() => {
    const s = new Set<string>();
    lines.filter((l) => l.committed).forEach((l) => ingMap[l.ingredient_id]?.allergens?.forEach((a) => s.add(a)));
    return Array.from(s);
  }, [lines, ingMap]);

  // Dirty detection (signature comparison)
  const sigOf = (r: Recipe | null, ls: Line[], ss: Step[]) => JSON.stringify({
    r: r && {
      name: r.name, family: r.family, category: r.category, description: r.description,
      yield_portions: r.yield_portions, margin_pct: r.margin_pct, dietary: r.dietary,
      source: r.source, source_url: r.source_url,
    },
    ls: ls.filter((l) => l.committed).map((l) => ({
      ingredient_id: l.ingredient_id, quantity: Number(l.quantity) || 0,
      unit_override: l.unit_override, ingredient_note: l.ingredient_note,
    })),
    ss: ss.filter((s) => s.committed).map((s) => ({
      description: s.description, estimated_time: s.estimated_time,
      time_unit: s.time_unit, degrees: s.degrees,
    })),
  });
  const dirty = useMemo(
    () => sigOf(recipe, lines, steps) !== sigOf(originalRecipe, originalLines, originalSteps),
    [recipe, lines, steps, originalRecipe, originalLines, originalSteps],
  );

  // Warn before unload if dirty
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const updateRecipe = (patch: Partial<Recipe>) => setRecipe((r) => (r ? { ...r, ...patch } : r));

  // ---- Lines ----
  const addLine = () => {
    setLines((ls) => [...ls, {
      uid: newUid(), ingredient_id: "", quantity: 0,
      unit_override: null, ingredient_note: null, position: ls.length, committed: false,
    }]);
  };
  const commitLine = (uid: string) => {
    setLines((ls) => ls.map((l) => {
      if (l.uid !== uid) return l;
      if (!l.ingredient_id) { toast.error("Pick an ingredient first"); return l; }
      return { ...l, committed: true };
    }));
  };
  const undoTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const removeLine = (uid: string) => {
    const snapshot = lines.find((l) => l.uid === uid);
    if (!snapshot) return;
    setLines((ls) => ls.filter((l) => l.uid !== uid));
    const restore = () => {
      setLines((ls) => {
        if (ls.some((l) => l.uid === uid)) return ls;
        const copy = [...ls];
        copy.splice(Math.min(snapshot.position, copy.length), 0, snapshot);
        return copy;
      });
    };
    toast("Ingredient removed", {
      action: { label: "Undo", onClick: restore },
      duration: 6000,
    });
  };

  // ---- Steps ----
  const addStep = () =>
    setSteps((ss) => [...ss, {
      uid: newUid(), step_number: ss.length + 1, description: "",
      estimated_time: null, time_unit: null, degrees: null, committed: false,
    }]);
  const commitStep = (uid: string) =>
    setSteps((ss) => ss.map((s) => {
      if (s.uid !== uid) return s;
      if (!s.description.trim()) { toast.error("Describe the step first"); return s; }
      return { ...s, committed: true };
    }));
  const removeStep = (uid: string) => {
    const idx = steps.findIndex((s) => s.uid === uid);
    if (idx < 0) return;
    const snapshot = steps[idx];
    setSteps((ss) => ss.filter((s) => s.uid !== uid).map((s, i) => ({ ...s, step_number: i + 1 })));
    const restore = () => {
      setSteps((ss) => {
        if (ss.some((s) => s.uid === uid)) return ss;
        const copy = [...ss];
        copy.splice(Math.min(idx, copy.length), 0, snapshot);
        return copy.map((s, i) => ({ ...s, step_number: i + 1 }));
      });
    };
    toast("Step removed", {
      action: { label: "Undo", onClick: restore },
      duration: 6000,
    });
  };

  // ---- Save / Discard ----
  const discardAll = () => {
    if (!originalRecipe) return;
    setRecipe(originalRecipe);
    setLines(originalLines);
    setSteps(originalSteps);
    undoTimers.current.forEach((t) => clearTimeout(t));
    toast("Changes discarded");
  };

  const saveAll = async () => {
    if (!recipe) return;
    const cleanLines = lines.filter((l) => l.committed && l.ingredient_id);
    const cleanSteps = steps.filter((s) => s.committed && s.description.trim());

    setBusy(true);
    const { error: rErr } = await supabase.from("recipes").update({
      name: recipe.name, family: recipe.family, category: recipe.category,
      description: recipe.description, yield_portions: recipe.yield_portions,
      margin_pct: recipe.margin_pct, dietary: recipe.dietary,
      source: recipe.source, source_url: recipe.source_url,
    }).eq("id", recipe.id);
    if (rErr) { setBusy(false); return toast.error(rErr.message); }

    const { error: dLErr } = await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipe.id);
    if (dLErr) { setBusy(false); return toast.error(dLErr.message); }
    if (cleanLines.length > 0) {
      const payload = cleanLines.map((l, i) => ({
        recipe_id: recipe.id, ingredient_id: l.ingredient_id,
        quantity: Number(l.quantity) || 0, unit_override: l.unit_override,
        ingredient_note: l.ingredient_note, position: i,
      }));
      const { error } = await supabase.from("recipe_ingredients").insert(payload);
      if (error) { setBusy(false); return toast.error(error.message); }
    }

    const { error: dSErr } = await supabase.from("recipe_steps").delete().eq("recipe_id", recipe.id);
    if (dSErr) { setBusy(false); return toast.error(dSErr.message); }
    if (cleanSteps.length > 0) {
      const payload = cleanSteps.map((s, i) => ({
        recipe_id: recipe.id, step_number: i + 1, description: s.description,
        estimated_time: s.estimated_time, time_unit: s.time_unit, degrees: s.degrees,
      }));
      const { error } = await supabase.from("recipe_steps").insert(payload);
      if (error) { setBusy(false); return toast.error(error.message); }
    }

    // Refresh baseline
    setOriginalRecipe(recipe);
    setOriginalLines(cleanLines.map((l, i) => ({ ...l, position: i })));
    setOriginalSteps(cleanSteps.map((s, i) => ({ ...s, step_number: i + 1 })));
    setLines(cleanLines.map((l, i) => ({ ...l, position: i })));
    setSteps(cleanSteps.map((s, i) => ({ ...s, step_number: i + 1 })));

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
    <div className="mx-auto max-w-5xl px-6 py-10 pb-28">
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
                <AutoTextarea value={recipe.description ?? ""} onChange={(e) => updateRecipe({ description: e.target.value })} />
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
              <div>
                <h2 className="font-display text-2xl">Ingredients</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Click <span className="font-medium text-foreground">+ Add line</span>, fill it in, then tap <Check className="inline h-3 w-3" /> to confirm. Removed by mistake? Hit <Undo2 className="inline h-3 w-3" /> Undo in the toast.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={addLine}>
                <Plus className="h-4 w-4 mr-1" /> Add line
              </Button>
            </div>

            {lines.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">No ingredients in this recipe yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {lines.map((l, idx) => {
                  const ing = ingMap[l.ingredient_id];
                  const cost = (Number(l.quantity) || 0) * Number(ing?.cost_per_unit ?? 0);
                  return (
                    <div
                      key={l.uid}
                      className={`rounded-xl border p-3 transition ${
                        l.committed ? "border-border bg-background/40" : "border-primary/40 bg-primary/5"
                      }`}
                    >
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="flex-1 min-w-[220px] space-y-1">
                          <Label className="text-xs text-muted-foreground">Ingredient</Label>
                          <IngredientCombobox
                            ingredients={ingredients}
                            value={l.ingredient_id}
                            onChange={(v) =>
                              setLines((ls) => ls.map((x) => (x.uid === l.uid ? { ...x, ingredient_id: v } : x)))
                            }
                            onCreated={(ing) => setIngredients((all) => [...all, ing].sort((a, b) => a.name.localeCompare(b.name)))}
                          />
                        </div>
                        <div className="w-24 space-y-1">
                          <Label className="text-xs text-muted-foreground">Quantity</Label>
                          <Input
                            type="number" step="0.01" min="0" value={l.quantity}
                            onChange={(e) => setLines((ls) => ls.map((x) => (x.uid === l.uid ? { ...x, quantity: Number(e.target.value) } : x)))}
                            className="text-right"
                          />
                        </div>
                        <div className="w-20 space-y-1">
                          <Label className="text-xs text-muted-foreground">Unit</Label>
                          <div className="h-9 flex items-center px-2 text-sm rounded-md border border-border bg-muted/30 text-muted-foreground">
                            {l.unit_override ?? ing?.unit ?? "—"}
                          </div>
                        </div>
                        <div className="w-24 space-y-1 text-right">
                          <Label className="text-xs text-muted-foreground">Cost</Label>
                          <div className="h-9 flex items-center justify-end px-2 text-sm tabular-nums">
                            {fmtMoney(cost)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-end gap-3">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs text-muted-foreground">Note (optional)</Label>
                          <Input
                            value={l.ingredient_note ?? ""} placeholder="e.g. sifted, room temperature"
                            onChange={(e) => setLines((ls) => ls.map((x) => (x.uid === l.uid ? { ...x, ingredient_note: e.target.value || null } : x)))}
                          />
                        </div>
                        <div className="flex items-center gap-1 pb-0.5">
                          {!l.committed && (
                            <Button
                              size="sm" variant="default" onClick={() => commitLine(l.uid)}
                              className="h-9"
                            >
                              <Check className="h-4 w-4 mr-1" /> Confirm
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => removeLine(l.uid)} aria-label={`Remove line ${idx + 1}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
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
              <div>
                <h2 className="font-display text-2xl">Method</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Add steps in order. Each step grows as you type — no cramped boxes.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={addStep}>
                <Plus className="h-4 w-4 mr-1" /> Add step
              </Button>
            </div>
            {steps.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">No method steps yet.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {steps.map((s, idx) => (
                  <li
                    key={s.uid}
                    className={`rounded-xl border p-3 transition ${
                      s.committed ? "border-border bg-background/40" : "border-primary/40 bg-primary/5"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 text-primary font-display flex items-center justify-center">
                        {idx + 1}
                      </div>
                      <div className="flex-1 space-y-2">
                        <AutoTextarea
                          placeholder="Describe what to do…"
                          value={s.description}
                          onChange={(e) => setSteps((ss) => ss.map((x) => (x.uid === s.uid ? { ...x, description: e.target.value } : x)))}
                          className="min-h-[44px]"
                        />
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="w-20 space-y-1">
                            <Label className="text-xs text-muted-foreground">Time</Label>
                            <Input
                              type="number" min="0" placeholder="—" value={s.estimated_time ?? ""}
                              onChange={(e) => setSteps((ss) => ss.map((x) => (x.uid === s.uid ? { ...x, estimated_time: e.target.value === "" ? null : Number(e.target.value) } : x)))}
                            />
                          </div>
                          <div className="w-32 space-y-1">
                            <Label className="text-xs text-muted-foreground">Unit</Label>
                            <Select
                              value={s.time_unit ?? "—"}
                              onValueChange={(v) => setSteps((ss) => ss.map((x) => (x.uid === s.uid ? { ...x, time_unit: v === "—" ? null : v } : x)))}
                            >
                              <SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="—">—</SelectItem>
                                {TIME_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-28 space-y-1">
                            <Label className="text-xs text-muted-foreground">Temp.</Label>
                            <Input
                              placeholder="160°C" value={s.degrees ?? ""}
                              onChange={(e) => setSteps((ss) => ss.map((x) => (x.uid === s.uid ? { ...x, degrees: e.target.value || null } : x)))}
                            />
                          </div>
                          <div className="ml-auto flex items-center gap-1">
                            {!s.committed && (
                              <Button size="sm" onClick={() => commitStep(s.uid)} className="h-9">
                                <Check className="h-4 w-4 mr-1" /> Confirm
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" onClick={() => removeStep(s.uid)} aria-label={`Remove step ${idx + 1}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
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
            <Button
              variant="outline"
              className="w-full mt-6"
              onClick={() =>
                downloadRecipePdf({
                  recipe,
                  lines: lines.filter((l) => l.committed),
                  steps: steps.filter((s) => s.committed),
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

      {/* Sticky unsaved-changes bar */}
      {dirty && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(640px,calc(100%-2rem))]">
          <div className="rounded-2xl border border-border bg-card/95 backdrop-blur shadow-xl px-4 py-3 flex items-center gap-3">
            <div className="flex-1 text-sm">
              <span className="font-medium">Unsaved changes</span>
              <span className="text-muted-foreground"> — review and save when you're ready.</span>
            </div>
            <Button variant="ghost" size="sm" onClick={discardAll} disabled={busy}>
              Discard
            </Button>
            <Button size="sm" onClick={saveAll} disabled={busy}>
              <Save className="h-4 w-4 mr-1" /> {busy ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      )}

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
