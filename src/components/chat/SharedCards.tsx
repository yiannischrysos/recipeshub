import { Link } from "@tanstack/react-router";
import { ChefHat, Carrot, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  saveIngredientFromSnapshot,
  type IngredientSnapshot,
  type RecipeSnapshot,
} from "@/lib/share-content";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";

export function SharedRecipeCard({
  snapshot,
  recipeId,
  mine,
}: {
  snapshot: RecipeSnapshot | null;
  recipeId: string | null;
  mine: boolean;
}) {
  const name = snapshot?.name ?? "Shared recipe";
  const inner = (
    <div
      className={`flex flex-col gap-1 rounded-lg border p-2.5 text-left ${
        mine
          ? "border-primary-foreground/20 bg-primary-foreground/10"
          : "border-border bg-background/60"
      }`}
    >
      <div className="flex items-center gap-2">
        <ChefHat className="h-4 w-4 shrink-0" />
        <span className="font-semibold text-sm leading-tight">{name}</span>
      </div>
      {snapshot?.category && (
        <div className="text-[11px] opacity-75">{snapshot.category}</div>
      )}
      {snapshot?.description && (
        <div className="text-xs opacity-80 line-clamp-2">{snapshot.description}</div>
      )}
      <div className="text-[11px] opacity-70 mt-0.5">
        Yield {snapshot?.yield_portions ?? 1} pp
      </div>
    </div>
  );
  if (recipeId && mine) {
    return (
      <Link to="/recipes/$id" params={{ id: recipeId }} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function SharedIngredientCard({
  snapshot,
  userId,
  mine,
}: {
  snapshot: IngredientSnapshot | null;
  userId: string;
  mine: boolean;
}) {
  const [saved, setSaved] = useState(false);
  if (!snapshot) {
    return (
      <div className="text-xs italic opacity-70">Shared ingredient unavailable</div>
    );
  }
  const save = async () => {
    const err = await saveIngredientFromSnapshot(userId, snapshot);
    if (err) toast.error(err.message);
    else {
      toast.success("Added to your ingredients");
      setSaved(true);
    }
  };
  return (
    <div
      className={`flex flex-col gap-1.5 rounded-lg border p-2.5 ${
        mine
          ? "border-primary-foreground/20 bg-primary-foreground/10"
          : "border-border bg-background/60"
      }`}
    >
      <div className="flex items-center gap-2">
        <Carrot className="h-4 w-4 shrink-0" />
        <span className="font-semibold text-sm leading-tight">{snapshot.name}</span>
      </div>
      <div className="text-[11px] opacity-80 flex flex-wrap gap-x-2">
        <span>per {snapshot.unit}</span>
        <span className="tabular-nums">{fmtMoney(snapshot.cost_per_unit)}</span>
        {snapshot.brand && <span>{snapshot.brand}</span>}
        {snapshot.category && <span>{snapshot.category}</span>}
      </div>
      {!mine && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs mt-1 self-start"
          onClick={save}
          disabled={saved}
        >
          {saved ? (
            <>
              <Check className="h-3 w-3" /> Saved
            </>
          ) : (
            <>
              <Plus className="h-3 w-3" /> Save to my ingredients
            </>
          )}
        </Button>
      )}
    </div>
  );
}
