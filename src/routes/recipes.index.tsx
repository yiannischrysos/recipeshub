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
import { Plus, ChefHat, Search, Eye, Pencil, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { DietaryChips } from "@/components/Chips";
import { RecipePreview } from "@/components/RecipePreview";
import { useFavorites } from "@/hooks/use-favorites";
import { FavoriteStar } from "@/components/FavoriteStar";

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

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((r) => {
      const k = r.category ?? "Uncategorized";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return map;
  }, [items]);

  if (loading || !user) return null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl">Recipes</h1>
          <p className="text-muted-foreground mt-1">
            {items.length} {items.length === 1 ? "recipe" : "recipes"} · costed end to end.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="lg"><Plus className="h-4 w-4 mr-1" /> New recipe</Button></DialogTrigger>
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

      {/* Category quick-pick grid */}
      {categories.length > 1 && (
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {categories.map((c) => {
            const active = cat === c;
            const count = c === "All" ? items.length : (categoryCounts.get(c) ?? 0);
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`group rounded-2xl border p-4 text-left transition-all ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border hover:border-primary/40 hover:bg-card"
                }`}
              >
                <div className={`text-[10px] uppercase tracking-widest ${active ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {count} {count === 1 ? "recipe" : "recipes"}
                </div>
                <div className="mt-1 font-display text-lg leading-tight truncate">{c}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="mt-6 sticky top-2 z-10">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search recipes…"
            className="pl-11 h-12 rounded-full bg-card/90 backdrop-blur shadow-sm"
          />
        </div>
      </div>

      {families.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-border bg-card p-16 text-center">
          <ChefHat className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-4 font-display text-xl">{items.length === 0 ? "No recipes yet" : "No matches"}</p>
          {items.length === 0 && <p className="text-muted-foreground mt-1">Create your first recipe to start costing.</p>}
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
          {families.map(({ head, subs }) => {
            const allLines = [head, ...subs].flatMap((r) => r.recipe_ingredients);
            const tc = allLines.reduce((s, line) => s + Number(line.quantity) * Number(line.ingredients?.cost_per_unit ?? 0), 0);
            const portions = head.yield_portions;
            const per = portions > 0 ? tc / portions : 0;
            const margin = Number(head.margin_pct) || 0;
            const price = margin >= 100 ? per : per / (1 - margin / 100);
            return (
              <div key={head.id} className="group relative hover:bg-secondary/40 transition-colors">
                <Link
                  to="/recipes/$id"
                  params={{ id: head.id }}
                  className="flex items-center gap-4 px-4 py-3 sm:px-5 sm:py-4"
                >
                  {/* Title block */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display text-lg sm:text-xl leading-tight truncate">
                        {head.family ?? head.name}
                      </span>
                      {head.category && (
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground bg-secondary/70 rounded-full px-2 py-0.5">
                          {head.category}
                        </span>
                      )}
                      {subs.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">+{subs.length} variant{subs.length > 1 ? "s" : ""}</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{portions} portion{portions === 1 ? "" : "s"}</span>
                      <span>·</span>
                      <span>{fmtMoney(per)} / portion</span>
                      {head.dietary.length > 0 && (
                        <span className="hidden sm:inline-flex"><DietaryChips items={head.dietary} /></span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="hidden sm:flex flex-col items-end shrink-0 pr-2">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Suggested</div>
                    <div className="font-display text-lg text-primary">{fmtMoney(price)}</div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title="Preview"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewId(head.id); }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title="Edit"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); nav({ to: "/recipes/$id", params: { id: head.id } }); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
                      title="Delete"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(head); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Link>

                {subs.length > 0 && (
                  <div className="px-5 pb-3 pl-6 flex flex-wrap gap-x-4 gap-y-1">
                    {subs.map((s) => (
                      <Link
                        key={s.id}
                        to="/recipes/$id"
                        params={{ id: s.id }}
                        className="text-xs text-muted-foreground hover:text-primary"
                      >
                        ↳ {s.name.replace(head.family ?? head.name, "").trim() || s.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <RecipePreview
        open={previewId !== null}
        onOpenChange={(o) => { if (!o) setPreviewId(null); }}
        recipeId={previewId ?? ""}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.family ?? deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the recipe along with its ingredients and method steps. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); removeRecipe(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

