// Flat modern chef illustrations (inline SVG, no external deps).
// Uses Tailwind utility colors that read from the design tokens via
// `currentColor` and explicit fills; safe across light/dark themes.

export type ChefIcon = "chef_male" | "chef_female";

export const CHEF_ICONS: { key: ChefIcon; label: string }[] = [
  { key: "chef_male", label: "Chef" },
  { key: "chef_female", label: "Chef" },
];

// Palette references via CSS variables defined in styles.css. We use
// var(--color-*) directly since the project tokens are oklch-based.
const COLORS = {
  bgRing: "var(--color-secondary)",
  hat: "var(--color-card)",
  hatStroke: "var(--color-foreground)",
  band: "var(--color-primary)",
  collar: "var(--color-card)",
  scarf: "var(--color-primary)",
  faceMale: "#f3c79c",
  faceFemale: "#f5d0b0",
  hair: "#3a2418",
  eyes: "var(--color-foreground)",
  cheeks: "#f4a8a8",
} as const;

export function ChefMale({ className = "h-full w-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="60" cy="60" r="60" fill={COLORS.bgRing} />
      {/* Chef hat */}
      <path
        d="M35 50 C 30 32, 50 22, 60 32 C 70 22, 90 32, 85 50 L 85 58 L 35 58 Z"
        fill={COLORS.hat}
        stroke={COLORS.hatStroke}
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.95"
      />
      <rect x="34" y="56" width="52" height="6" rx="1.5" fill={COLORS.band} />
      {/* Face */}
      <ellipse cx="60" cy="80" rx="18" ry="20" fill={COLORS.faceMale} stroke={COLORS.hatStroke} strokeOpacity="0.6" strokeWidth="1.5" />
      {/* Sideburns */}
      <path d="M44 76 q-1 6 1 12" fill="none" stroke={COLORS.hair} strokeWidth="3" strokeLinecap="round" />
      <path d="M76 76 q1 6 -1 12" fill="none" stroke={COLORS.hair} strokeWidth="3" strokeLinecap="round" />
      {/* Eyes */}
      <circle cx="53" cy="80" r="1.8" fill={COLORS.eyes} />
      <circle cx="67" cy="80" r="1.8" fill={COLORS.eyes} />
      {/* Smile */}
      <path d="M53 89 Q60 94 67 89" fill="none" stroke={COLORS.eyes} strokeWidth="2" strokeLinecap="round" />
      {/* Mustache */}
      <path d="M52 86 q4 -2 8 0 q4 -2 8 0" fill="none" stroke={COLORS.hair} strokeWidth="2" strokeLinecap="round" />
      {/* Collar */}
      <path d="M40 98 q20 12 40 0 L 80 120 L 40 120 Z" fill={COLORS.collar} stroke={COLORS.hatStroke} strokeOpacity="0.7" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Neckerchief */}
      <path d="M52 101 L 60 107 L 68 101 L 64 113 L 56 113 Z" fill={COLORS.scarf} />
    </svg>
  );
}

export function ChefFemale({ className = "h-full w-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="60" cy="60" r="60" fill={COLORS.bgRing} />
      {/* Hair behind */}
      <path d="M40 70 Q 36 96 48 104 L 72 104 Q 84 96 80 70 Z" fill={COLORS.hair} />
      {/* Chef hat */}
      <path
        d="M35 50 C 30 32, 50 22, 60 32 C 70 22, 90 32, 85 50 L 85 58 L 35 58 Z"
        fill={COLORS.hat}
        stroke={COLORS.hatStroke}
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.95"
      />
      <rect x="34" y="56" width="52" height="6" rx="1.5" fill={COLORS.band} />
      {/* Face */}
      <ellipse cx="60" cy="80" rx="17" ry="19" fill={COLORS.faceFemale} stroke={COLORS.hatStroke} strokeOpacity="0.6" strokeWidth="1.5" />
      {/* Bangs */}
      <path d="M44 68 Q 60 60 76 68 Q 70 74 60 71 Q 50 74 44 68 Z" fill={COLORS.hair} />
      {/* Eyelashes */}
      <path d="M50.5 79 q2.5 -2 5 0" fill="none" stroke={COLORS.eyes} strokeWidth="2" strokeLinecap="round" />
      <path d="M64.5 79 q2.5 -2 5 0" fill="none" stroke={COLORS.eyes} strokeWidth="2" strokeLinecap="round" />
      <circle cx="53" cy="81" r="1.6" fill={COLORS.eyes} />
      <circle cx="67" cy="81" r="1.6" fill={COLORS.eyes} />
      {/* Cheeks */}
      <circle cx="50" cy="88" r="2.2" fill={COLORS.cheeks} opacity="0.7" />
      <circle cx="70" cy="88" r="2.2" fill={COLORS.cheeks} opacity="0.7" />
      {/* Smile */}
      <path d="M54 91 Q60 95 66 91" fill="none" stroke={COLORS.eyes} strokeWidth="2" strokeLinecap="round" />
      {/* Collar */}
      <path d="M40 98 q20 12 40 0 L 80 120 L 40 120 Z" fill={COLORS.collar} stroke={COLORS.hatStroke} strokeOpacity="0.7" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Neckerchief */}
      <path d="M52 101 L 60 107 L 68 101 L 64 113 L 56 113 Z" fill={COLORS.scarf} />
    </svg>
  );
}

export function ChefIconRender({ icon, className }: { icon: ChefIcon | null | undefined; className?: string }) {
  if (icon === "chef_female") return <ChefFemale className={className} />;
  return <ChefMale className={className} />;
}
