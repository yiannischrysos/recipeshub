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
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/ingredients")({
  component: IngredientsPage,
});

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  supplier: string | null;
  notes: string | null;
};

const UNITS = ["g", "kg", "ml", "L", "unit", "tbsp", "tsp"];

function IngredientsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<Ingredient[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  const load = async () => {
    const { data, error } = await supabase
      .from("ingredients")
      .select("*")
      .order("name");
    if (error) return toast.error(error.message);
    setItems((data ?? []) as Ingredient[]);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const filtered = useMemo(
    () => items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase())),
    [items, q],
  );

  const remove = async (id: string) => {
    if (!confirm("Delete this ingredient? Recipes using it will block deletion.")) return;
    const { error } = await supabase.from("ingredients").delete().eq("id", id);
    if (error) return toast.error("Cannot delete — used in a recipe.");
    toast.success("Deleted");
    load();
  };

  if (loading || !user) return null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Ingredients</h1>
          <p className="text-muted-foreground mt-1">Your pantry, with cost per unit.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" /> New ingredient
            </Button>
          </DialogTrigger>
          <IngredientDialog
            editing={editing}
            onSaved={() => { setOpen(false); setEditing(null); load(); }}
          />
        </Dialog>
      </div>

      <div className="mt-6 relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search ingredients…"
          className="pl-9 max-w-sm"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            {items.length === 0 ? "No ingredients yet — add your first one." : "No matches."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium text-right">Cost / unit</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium">{i.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">per {i.unit}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtMoney(Number(i.cost_per_unit))}</td>
                  <td className="px-4 py-3 text-muted-foreground">{i.supplier ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(i); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(i.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function IngredientDialog({
  editing, onSaved,
}: {
  editing: Ingredient | null;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState(editing?.name ?? "");
  const [unit, setUnit] = useState(editing?.unit ?? "g");
  const [cost, setCost] = useState(String(editing?.cost_per_unit ?? ""));
  const [supplier, setSupplier] = useState(editing?.supplier ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(editing?.name ?? "");
    setUnit(editing?.unit ?? "g");
    setCost(String(editing?.cost_per_unit ?? ""));
    setSupplier(editing?.supplier ?? "");
    setNotes(editing?.notes ?? "");
  }, [editing]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const payload = {
      name: name.trim(),
      unit,
      cost_per_unit: Number(cost) || 0,
      supplier: supplier.trim() || null,
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
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="font-display text-2xl">
          {editing ? "Edit ingredient" : "New ingredient"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="T55 flour" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Unit</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Cost per {unit}</Label>
            <Input
              type="number" step="0.0001" min="0" required
              value={cost} onChange={(e) => setCost(e.target.value)}
              placeholder="0.0012"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Supplier (optional)</Label>
          <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Notes (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
