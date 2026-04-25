import { ALLERGEN_EMOJI, DIETARY_EMOJI } from "@/lib/taxonomy";

export function Chip({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "primary" | "accent" }) {
  const cls =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "accent"
        ? "bg-accent/30 text-accent-foreground"
        : "bg-secondary text-secondary-foreground";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

export function AllergenChips({ items }: { items: string[] | null | undefined }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((a) => (
        <Chip key={a} tone="accent">
          <span>{ALLERGEN_EMOJI[a] ?? "•"}</span> {a}
        </Chip>
      ))}
    </div>
  );
}

export function DietaryChips({ items }: { items: string[] | null | undefined }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((d) => (
        <Chip key={d} tone="muted">
          <span>{DIETARY_EMOJI[d] ?? "•"}</span> {d}
        </Chip>
      ))}
    </div>
  );
}
