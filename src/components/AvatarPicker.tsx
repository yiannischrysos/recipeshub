import { CHEF_ICONS, type ChefIcon, ChefIconRender } from "@/lib/avatars";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function AvatarPicker({
  value,
  onChange,
}: {
  value: ChefIcon | string | null | undefined;
  onChange: (icon: ChefIcon) => void;
}) {
  const current: ChefIcon = value === "chef_female" ? "chef_female" : "chef_male";
  return (
    <div className="flex flex-wrap gap-3">
      {CHEF_ICONS.map((opt) => {
        const selected = opt.key === current;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={cn(
              "relative h-20 w-20 rounded-2xl overflow-hidden border-2 transition-all",
              selected
                ? "border-primary ring-2 ring-primary/30 scale-105"
                : "border-border hover:border-primary/50",
            )}
            aria-label={`Select ${opt.label} avatar`}
            aria-pressed={selected}
          >
            <ChefIconRender icon={opt.key} className="h-full w-full" />
            {selected && (
              <span className="absolute top-1 right-1 grid place-items-center h-5 w-5 rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
