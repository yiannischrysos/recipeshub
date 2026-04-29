import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, Star } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { ALLERGENS, DIETARY, ALLERGEN_EMOJI, DIETARY_EMOJI } from "@/lib/taxonomy";
import { AllergenChips, DietaryChips } from "@/components/Chips";
import { useFavorites } from "@/hooks/use-favorites";
import { FavoriteStar } from "@/components/FavoriteStar";

export const Route = createFileRoute("/ingredients")({
  component: IngredientsPage,
});

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  supplier: string | null;
  category: string | null;
  brand: string | null;
  description: string | null;
  allergens: string[];
  dietary: string[];
  notes: string | null;
};

const UNITS = ["g", "kg", "ml", "L", "Piece(s)", "Pinch(es)", "Tea Spoon(s)", "Table Spoon(s)", "Cup(s)", "Slice(s)", "Leave(s)", "Bunch(es)", "Clove(s)", "N/A"];

function IngredientsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<Ingredient[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [loading, user, nav]);

  const load = async () => {
    const { data, error } = await supabase.from("ingredients").select("*").order("name");
    if (error) return toast.error(error.message);
    setItems((data ?? []) as Ingredient[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const filtered = useMemo(
    () => items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase())),
    [items, q],
  );

  const remove = async (id: string) => {
    if (!confirm("Delete this ingredient? Recipes using it will block deletion.")) return;
    const { error } = await supabase.from("ingredients").delete().eq("id", id);
    if (error) return toast.error("Cannot delete — used in a recipe.");
    toast.success("Deleted"); load();
  };

  if (loading || !user) return null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Ingredients</h1>
          <p className="text-muted-foreground mt-1">{items.length} ingredients · cost per unit, allergens & dietary tags.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New ingredient</Button></DialogTrigger>
          <IngredientDialog
            editing={editing}
            onSaved={() => { setOpen(false); setEditing(null); load(); }}
          />
        </Dialog>
      </div>

      <div className="mt-6 relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ingredients…" className="pl-9 max-w-sm" />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            {items.length === 0 ? "No ingredients yet — add your first one." : "No matches."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((i) => (
              <div key={i.id} className="p-4 hover:bg-secondary/30 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-medium">{i.name}</span>
                    {i.description && <span className="text-xs text-muted-foreground">— {i.description}</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5 items-center">
                    <AllergenChips items={i.allergens} />
                    <DietaryChips items={i.dietary} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm tabular-nums">{fmtMoney(Number(i.cost_per_unit))} <span className="text-muted-foreground">/ {i.unit}</span></div>
                  {i.supplier && <div className="text-xs text-muted-foreground">{i.supplier}</div>}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(i); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MultiToggle({
  label, options, emojiMap, value, onChange,
}: {
  label: string;
  options: string[];
  emojiMap: Record<string, string>;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (o: string) =>
    onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <button
              type="button"
              key={o}
              onClick={() => toggle(o)}
              className={`text-xs rounded-full px-2.5 py-1 border transition ${
                on ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary"
              }`}
            >
              {emojiMap[o] ?? "•"} {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function IngredientDialog({ editing, onSaved }: { editing: Ingredient | null; onSaved: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("g");
  const [cost, setCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [allergens, setAllergens] = useState<string[]>([]);
  const [dietary, setDietary] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(editing?.name ?? "");
    setUnit(editing?.unit ?? "g");
    setCost(String(editing?.cost_per_unit ?? ""));
    setSupplier(editing?.supplier ?? "");
    setDescription(editing?.description ?? "");
    setBrand(editing?.brand ?? "");
    setCategory(editing?.category ?? "");
    setAllergens(editing?.allergens ?? []);
    setDietary(editing?.dietary ?? []);
    setNotes(editing?.notes ?? "");
  }, [editing]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const payload = {
      name: name.trim(), unit, cost_per_unit: Number(cost) || 0,
      supplier: supplier.trim() || null,
      description: description.trim() || null,
      brand: brand.trim() || null,
      category: category.trim() || null,
      allergens, dietary,
      notes: notes.trim() || null,
      user_id: user.id,
    };
    const { error } = editing
      ? await supabase.from("ingredients").update(payload).eq("id", editing.id)
      : await supabase.from("ingredients").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Updated" : "Added");
    onSaved();
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl">{editing ? "Edit ingredient" : "New ingredient"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="T55 flour" />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="82% Animal Fat" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Unit</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Cost per {unit}</Label>
            <Input type="number" step="0.0001" min="0" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.0012" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Brand</Label>
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Supplier</Label>
          <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        </div>
        <MultiToggle label="Allergens" options={ALLERGENS} emojiMap={ALLERGEN_EMOJI} value={allergens} onChange={setAllergens} />
        <MultiToggle label="Dietary" options={DIETARY} emojiMap={DIETARY_EMOJI} value={dietary} onChange={setDietary} />
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
        <DialogFooter><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
