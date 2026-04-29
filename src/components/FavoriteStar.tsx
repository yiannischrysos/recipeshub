import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FavoriteStar({
  active,
  onToggle,
  className,
}: {
  active: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      title={active ? "Remove from favorites" : "Add to favorites"}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
      className={cn("h-8 w-8", className)}
    >
      <Star
        className={cn(
          "h-4 w-4 transition-colors",
          active ? "fill-amber-400 text-amber-500" : "text-muted-foreground",
        )}
      />
    </Button>
  );
}
