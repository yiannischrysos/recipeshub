import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export type ComboIngredient = {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  allergens: string[];
  dietary: string[];
};

type Props = {
  ingredients: ComboIngredient[];
  value: string;
  onChange: (id: string) => void;
  onCreated: (ing: ComboIngredient) => void;
};

export function IngredientCombobox({ ingredients, value, onChange, onCreated }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [seedName, setSeedName] = useState("");
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("g");
  const [newCost, setNewCost] = useState<string>("0");
  const [saving, setSaving] = useState(false);

  const selected = useMemo(() => ingredients.find((i) => i.id === value), [ingredients, value]);

  const exactMatch = useMemo(
    () => ingredients.some((i) => i.name.toLowerCase() === query.trim().toLowerCase()),
    [ingredients, query],
  );

  const openCreate = (name: string) => {
    setSeedName(name);
    setNewName(name);
    setNewUnit("g");
    setNewCost("0");
    setCreateOpen(true);
    setOpen(false);
  };

  const saveNew = async () => {
    if (!user) return;
    const name = newName.trim();
    if (!name) return toast.error("Name is required");
    if (!newUnit.trim()) return toast.error("Unit is required");
    setSaving(true);
    const { data, error } = await supabase
      .from("ingredients")
      .insert({
        user_id: user.id,
        name,
        unit: newUnit.trim(),
        cost_per_unit: Number(newCost) || 0,
      })
      .select("id,name,unit,cost_per_unit,allergens,dietary")
      .single();
    setSaving(false);
    if (error || !data) return toast.error(error?.message ?? "Failed to create");
    toast.success(`Added "${data.name}"`);
    onCreated(data as ComboIngredient);
    onChange(data.id);
    setCreateOpen(false);
    setQuery("");
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="truncate">{selected?.name ?? "Select ingredient…"}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter>
            <CommandInput
              placeholder="Search or type new…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>
                <button
                  type="button"
                  onClick={() => openCreate(query.trim() || "")}
                  className="mx-auto flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  Create {query.trim() ? `"${query.trim()}"` : "new ingredient"}
                </button>
              </CommandEmpty>
              <CommandGroup>
                {ingredients.map((i) => (
                  <CommandItem
                    key={i.id}
                    value={i.name}
                    onSelect={() => {
                      onChange(i.id);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        i.id === value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{i.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{i.unit}</span>
                  </CommandItem>
                ))}
                {query.trim() && !exactMatch && (
                  <CommandItem
                    value={`__create__${query}`}
                    onSelect={() => openCreate(query.trim())}
                    className="text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create "{query.trim()}"
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New ingredient{seedName ? `: ${seedName}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Input
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder="g, ml, pcs…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cost / unit (€)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              You can edit allergens, supplier, and other details later from Ingredients.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveNew} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save ingredient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
