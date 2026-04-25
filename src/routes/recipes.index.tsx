import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, ChefHat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/recipes/")({
  component: RecipesIndex,
});

type RecipeRow = {
  id: string;
  name: string;
  category: string | null;
  yield_portions: number;
  margin_pct: number;
  recipe_ingredients: { quantity: number; ingredients: { cost_per_unit: number } | null }[];
};

function RecipesIndex() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<RecipeRow[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  const load = async () => {
    const { data, error } = await supabase
      .from("recipes")
      .select("id,name,category,yield_portions,margin_pct,recipe_ingredients(quantity,ingredients(cost_per_unit))")
      .order("created_at", { ascending: false });
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
      .insert({ name: name.trim(), category: category.trim() || null, user_id: user.id })
      .select()
      .single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Recipe created");
    setOpen(false); setName(""); setCategory("");
    nav({ to: "/recipes/$id", params: { id: data.id } });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this recipe?")) return;
    const { error } = await supabase.from("recipes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const totalCost = (r: RecipeRow) =>
    r.recipe_ingredients.reduce(
      (s, line) => s + Number(line.quantity) * Number(line.ingredients?.cost_per_unit ?? 0),
      0,
    );

  if (loading || !user) return null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Recipes</h1>
          <p className="text-muted-foreground mt-1">Every recipe, costed end to end.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> New recipe</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">New recipe</DialogTitle>
            </DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Croissant" />
              </div>
              <div className="space-y-2">
                <Label>Category (optional)</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Viennoiserie" />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-border bg-card p-16 text-center">
          <ChefHat className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-4 font-display text-xl">No recipes yet</p>
          <p className="text-muted-foreground mt-1">Create your first recipe to start costing.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((r) => {
            const tc = totalCost(r);
            const per = r.yield_portions > 0 ? tc / r.yield_portions : 0;
            const margin = Number(r.margin_pct) || 0;
            const price = margin >= 100 ? per : per / (1 - margin / 100);
            return (
              <div key={r.id} className="group rounded-2xl border border-border bg-card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {r.category && (
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">{r.category}</div>
                    )}
                    <Link to="/recipes/$id" params={{ id: r.id }} className="font-display text-2xl hover:text-primary">
                      {r.name}
                    </Link>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Stat label="Total cost" value={fmtMoney(tc)} />
                  <Stat label="Per portion" value={fmtMoney(per)} />
                  <Stat label="Portions" value={String(r.yield_portions)} />
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
    <div className={`rounded-lg p-3 ${accent ? "bg-primary/10" : "bg-secondary/60"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-lg ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}
