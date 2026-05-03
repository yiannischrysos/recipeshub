import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChefHat, Carrot, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

type Recipe = { id: string; name: string; category: string | null };
type Ingredient = { id: string; name: string; unit: string; category: string | null };

export function SharePicker({
  onPickRecipe,
  onPickIngredient,
}: {
  onPickRecipe: (id: string) => Promise<void> | void;
  onPickIngredient: (id: string) => Promise<void> | void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ings, setIngs] = useState<Ingredient[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const [{ data: rs }, { data: is }] = await Promise.all([
        supabase.from("recipes").select("id,name,category").order("name").limit(500),
        supabase.from("ingredients").select("id,name,unit,category").order("name").limit(500),
      ]);
      setRecipes((rs ?? []) as Recipe[]);
      setIngs((is ?? []) as Ingredient[]);
    })();
  }, [open, user]);

  const ql = q.trim().toLowerCase();
  const filteredRecipes = ql
    ? recipes.filter((r) => r.name.toLowerCase().includes(ql))
    : recipes;
  const filteredIngs = ql
    ? ings.filter((i) => i.name.toLowerCase().includes(ql))
    : ings;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          title="Share recipe or ingredient"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share with this chat</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="recipes">
          <TabsList className="w-full">
            <TabsTrigger value="recipes" className="flex-1">
              <ChefHat className="h-4 w-4 mr-1" /> Recipes
            </TabsTrigger>
            <TabsTrigger value="ingredients" className="flex-1">
              <Carrot className="h-4 w-4 mr-1" /> Ingredients
            </TabsTrigger>
          </TabsList>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="mt-3"
          />
          <TabsContent value="recipes" className="mt-2">
            <PickerList
              empty="You don't have any recipes yet."
              items={filteredRecipes.map((r) => ({
                id: r.id,
                title: r.name,
                subtitle: r.category ?? undefined,
              }))}
              onPick={async (id) => {
                await onPickRecipe(id);
                setOpen(false);
              }}
            />
          </TabsContent>
          <TabsContent value="ingredients" className="mt-2">
            <PickerList
              empty="You don't have any ingredients yet."
              items={filteredIngs.map((i) => ({
                id: i.id,
                title: i.name,
                subtitle: [i.unit, i.category].filter(Boolean).join(" · "),
              }))}
              onPick={async (id) => {
                await onPickIngredient(id);
                setOpen(false);
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function PickerList({
  items,
  empty,
  onPick,
}: {
  items: { id: string; title: string; subtitle?: string }[];
  empty: string;
  onPick: (id: string) => void;
}) {
  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground p-4 text-center">{empty}</div>;
  }
  return (
    <div className="max-h-80 overflow-y-auto space-y-1">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onPick(it.id)}
          className="w-full text-left px-3 py-2 rounded-md hover:bg-secondary"
        >
          <div className="text-sm font-medium">{it.title}</div>
          {it.subtitle && (
            <div className="text-xs text-muted-foreground">{it.subtitle}</div>
          )}
        </button>
      ))}
    </div>
  );
}
