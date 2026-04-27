import { ChefIconRender, type ChefIcon } from "@/lib/avatars";
import { cn } from "@/lib/utils";

export function ChefAvatar({
  icon,
  size = 40,
  className,
}: {
  icon: ChefIcon | string | null | undefined;
  size?: number;
  className?: string;
}) {
  const safeIcon: ChefIcon = icon === "chef_female" ? "chef_female" : "chef_male";
  return (
    <div
      className={cn("rounded-full overflow-hidden bg-secondary shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <ChefIconRender icon={safeIcon} className="h-full w-full" />
    </div>
  );
}
