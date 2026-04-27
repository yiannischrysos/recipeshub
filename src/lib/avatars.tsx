// Flat modern chef illustrations (inline SVG, no external deps)

export type ChefIcon = "chef_male" | "chef_female";

export const CHEF_ICONS: { key: ChefIcon; label: string }[] = [
  { key: "chef_male", label: "Chef" },
  { key: "chef_female", label: "Chef" },
];

export function ChefMale({ className = "h-full w-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Background circle */}
      <circle cx="60" cy="60" r="60" fill="hsl(var(--primary) / 0.12)" />
      {/* Chef hat */}
      <path
        d="M35 48 C 30 32, 50 22, 60 32 C 70 22, 90 32, 85 48 L 85 56 L 35 56 Z"
        fill="hsl(var(--card))"
        stroke="hsl(var(--foreground) / 0.85)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Hat band */}
      <rect x="34" y="55" width="52" height="6" rx="1.5" fill="hsl(var(--primary))" />
      {/* Face */}
      <ellipse cx="60" cy="78" rx="18" ry="20" fill="#f3c79c" stroke="hsl(var(--foreground) / 0.85)" strokeWidth="2" />
      {/* Hair sides */}
      <path d="M44 70 q-2 8 0 14" fill="none" stroke="hsl(var(--foreground) / 0.7)" strokeWidth="3" strokeLinecap="round" />
      <path d="M76 70 q2 8 0 14" fill="none" stroke="hsl(var(--foreground) / 0.7)" strokeWidth="3" strokeLinecap="round" />
      {/* Eyes */}
      <circle cx="53" cy="78" r="1.8" fill="hsl(var(--foreground))" />
      <circle cx="67" cy="78" r="1.8" fill="hsl(var(--foreground))" />
      {/* Smile */}
      <path d="M53 87 Q60 92 67 87" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" />
      {/* Mustache */}
      <path d="M52 84 q4 -2 8 0 q4 -2 8 0" fill="none" stroke="hsl(var(--foreground) / 0.7)" strokeWidth="2" strokeLinecap="round" />
      {/* Collar */}
      <path d="M40 96 q20 12 40 0 L 80 110 L 40 110 Z" fill="hsl(var(--card))" stroke="hsl(var(--foreground) / 0.85)" strokeWidth="2" strokeLinejoin="round" />
      {/* Neckerchief */}
      <path d="M52 99 L 60 105 L 68 99 L 64 109 L 56 109 Z" fill="hsl(var(--primary))" />
    </svg>
  );
}

export function ChefFemale({ className = "h-full w-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Background circle */}
      <circle cx="60" cy="60" r="60" fill="hsl(var(--primary) / 0.12)" />
      {/* Chef hat */}
      <path
        d="M35 48 C 30 32, 50 22, 60 32 C 70 22, 90 32, 85 48 L 85 56 L 35 56 Z"
        fill="hsl(var(--card))"
        stroke="hsl(var(--foreground) / 0.85)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Hat band */}
      <rect x="34" y="55" width="52" height="6" rx="1.5" fill="hsl(var(--primary))" />
      {/* Hair behind face */}
      <path
        d="M40 70 Q 38 92 46 100 L 74 100 Q 82 92 80 70 Z"
        fill="hsl(25 35% 22%)"
      />
      {/* Face */}
      <ellipse cx="60" cy="78" rx="17" ry="19" fill="#f5d0b0" stroke="hsl(var(--foreground) / 0.85)" strokeWidth="2" />
      {/* Bangs */}
      <path d="M44 66 Q 60 60 76 66 Q 70 72 60 70 Q 50 72 44 66 Z" fill="hsl(25 35% 22%)" />
      {/* Eyelashes / eyes */}
      <path d="M51 78 q2 -2 4 0" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" />
      <path d="M65 78 q2 -2 4 0" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" />
      <circle cx="53" cy="79.5" r="1.6" fill="hsl(var(--foreground))" />
      <circle cx="67" cy="79.5" r="1.6" fill="hsl(var(--foreground))" />
      {/* Cheeks */}
      <circle cx="50" cy="86" r="2.2" fill="hsl(0 70% 75% / 0.6)" />
      <circle cx="70" cy="86" r="2.2" fill="hsl(0 70% 75% / 0.6)" />
      {/* Smile */}
      <path d="M54 89 Q60 93 66 89" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" />
      {/* Collar */}
      <path d="M40 96 q20 12 40 0 L 80 110 L 40 110 Z" fill="hsl(var(--card))" stroke="hsl(var(--foreground) / 0.85)" strokeWidth="2" strokeLinejoin="round" />
      {/* Neckerchief */}
      <path d="M52 99 L 60 105 L 68 99 L 64 109 L 56 109 Z" fill="hsl(var(--primary))" />
    </svg>
  );
}

export function ChefIconRender({ icon, className }: { icon: ChefIcon | null | undefined; className?: string }) {
  if (icon === "chef_female") return <ChefFemale className={className} />;
  // Default to male chef if unset
  return <ChefMale className={className} />;
}
