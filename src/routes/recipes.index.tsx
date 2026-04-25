import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, ChefHat, Search, Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { DietaryChips } from "@/components/Chips";
import { RecipePreview } from "@/components/RecipePreview";

export const Route = createFileRoute("/recipes/")({
  component: RecipesIndex,
});

type RecipeRow = {
  id: string;
  name: string;
  family: string | null;
  category: string | null;
  dietary: string[];
  yield_portions: number;
  margin_pct: number;
  parent_id: string | null;
  recipe_order: number | null;
  recipe_ingredients: { quantity: number; ingredients: { cost_per_unit: number } | null }[];
};

function RecipesIndex() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<RecipeRow[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecipeRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const removeRecipe = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("recipes").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success(`Deleted "${deleteTarget.name}"`);
    setDeleteTarget(null);
    load();
  };

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [loading, user, nav]);

  const load = async () => {
    const { data, error } = await supabase
      .from("recipes")
      .select("id,name,family,category,dietary,yield_portions,margin_pct,parent_id,recipe_order,recipe_ingredients(quantity,ingredients(cost_per_unit))")
      .order("family", { ascending: true })
      .order("recipe_order", { ascending: true, nullsFirst: false })
      .order("name");
    if (error) return toast.error(error.message);
    setItems((data ?? []) as unknown as RecipeRow[]);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("recipes")
      .insert({ name: name.trim(), category: category.trim() || null, family: name.trim(), user_id: user.id })
      .select().single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Recipe created");
    setOpen(false); setName(""); setCategory("");
    nav({ to: "/recipes/$id", params: { id: data.id } });
  };

  const totalCost = (r: RecipeRow) =>
    r.recipe_ingredients.reduce(
      (s, line) => s + Number(line.quantity) * Number(line.ingredients?.cost_per_unit ?? 0), 0);

  // Filter + group by family
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((r) => r.category && set.add(r.category));
    return ["All", ...Array.from(set).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return items.filter((r) => {
      if (cat !== "All" && r.category !== cat) return false;
      if (!ql) return true;
      return r.name.toLowerCase().includes(ql) || (r.family ?? "").toLowerCase().includes(ql);
    });
  }, [items, q, cat]);

  const families = useMemo(() => {
    // Group: parent recipe (or self if no parent) -> children
    const byId = new Map(filtered.map((r) => [r.id, r]));
    const groups = new Map<string, { head: RecipeRow; subs: RecipeRow[] }>();
    for (const r of filtered) {
      const parent = r.parent_id && byId.get(r.parent_id) ? byId.get(r.parent_id)! : r;
      const key = parent.id;
      if (!groups.has(key)) groups.set(key, { head: parent, subs: [] });
      if (r.id !== parent.id) groups.get(key)!.subs.push(r);
    }
    return Array.from(groups.values());
  }, [filtered]);

  if (loading || !user) return null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Recipes</h1>
          <p className="text-muted-foreground mt-1">{items.length} recipes · costed end to end.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New recipe</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display text-2xl">New recipe</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Croissant" /></div>
              <div className="space-y-2"><Label>Category (optional)</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Viennoiserie" /></div>
              <DialogFooter><Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recipes…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`text-xs rounded-full px-3 py-1.5 border transition ${
                cat === c ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary"
              }`}
            >{c}</button>
          ))}
        </div>
      </div>

      {families.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-border bg-card p-16 text-center">
          <ChefHat className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-4 font-display text-xl">{items.length === 0 ? "No recipes yet" : "No matches"}</p>
          {items.length === 0 && <p className="text-muted-foreground mt-1">Create your first recipe to start costing.</p>}
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {families.map(({ head, subs }) => {
            const allLines = [head, ...subs].flatMap((r) => r.recipe_ingredients);
            const tc = allLines.reduce((s, line) => s + Number(line.quantity) * Number(line.ingredients?.cost_per_unit ?? 0), 0);
            const portions = head.yield_portions;
            const per = portions > 0 ? tc / portions : 0;
            const margin = Number(head.margin_pct) || 0;
            const price = margin >= 100 ? per : per / (1 - margin / 100);
            return (
              <div key={head.id} className="rounded-2xl border border-border bg-card p-5 hover:shadow-md transition-shadow flex flex-col">
                {head.category && <div className="text-xs uppercase tracking-widest text-muted-foreground">{head.category}</div>}
                <Link to="/recipes/$id" params={{ id: head.id }} className="font-display text-2xl hover:text-primary leading-tight">
                  {head.family ?? head.name}
                </Link>
                <div className="mt-2"><DietaryChips items={head.dietary} /></div>

                {subs.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {subs.map((s) => (
                      <Link key={s.id} to="/recipes/$id" params={{ id: s.id }}
                        className="block text-sm text-muted-foreground hover:text-primary">
                        ↳ {s.name.replace(head.family ?? head.name, "").trim() || s.name}
                      </Link>
                    ))}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <Stat label="Total cost" value={fmtMoney(tc)} />
                  <Stat label="Per portion" value={fmtMoney(per)} />
                  <Stat label="Portions" value={String(portions)} />
                  <Stat label="Suggested" value={fmtMoney(price)} accent />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg p-2.5 ${accent ? "bg-primary/10" : "bg-secondary/60"}`}>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-display text-base ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}
