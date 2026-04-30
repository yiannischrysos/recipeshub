import { createFileRoute } from "@tanstack/react-router";
import c1 from "@/assets/favicon-concept-1.png";
import c2 from "@/assets/favicon-concept-2.png";
import c3 from "@/assets/favicon-concept-3.png";
import c4 from "@/assets/favicon-concept-4.png";

export const Route = createFileRoute("/favicons")({
  component: FaviconsPage,
  head: () => ({
    meta: [
      { title: "Favicon concepts — RecipesHub" },
      { name: "description", content: "Preview of brand identity / favicon concepts for RecipesHub." },
    ],
  }),
});

const concepts = [
  { src: c1, name: "Concept 1 — Emerald Chef Hat", desc: "Rounded chef hat in emerald, friendly and culinary-forward." },
  { src: c2, name: "Concept 2 — Sunset Gradient R", desc: "Bold monogram with warm sunset gradient. App-store ready." },
  { src: c3, name: "Concept 3 — Basil Mandala", desc: "Symmetrical leaf mark — fresh, organic, premium feel." },
  { src: c4, name: "Concept 4 — Geometric Bowl", desc: "Minimal bowl + steam. Pure geometry, very modern." },
];

function FaviconsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Favicon concepts</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Four directions to choose from. Tell me which you'd like and I'll prepare the full set
          (16, 32, 180, 512 + manifest) for web and mobile.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        {concepts.map((c) => (
          <div key={c.name} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
            <div className="flex items-center justify-center gap-6 rounded-lg bg-muted/40 py-8">
              <img src={c.src} alt={c.name} className="h-32 w-32 rounded-2xl shadow-md" />
              <div className="flex flex-col gap-3 items-center">
                <img src={c.src} alt="" className="h-16 w-16 rounded-lg" />
                <img src={c.src} alt="" className="h-8 w-8 rounded-md" />
                <img src={c.src} alt="" className="h-4 w-4 rounded-sm" />
              </div>
            </div>
            <div>
              <div className="font-medium">{c.name}</div>
              <p className="text-sm text-muted-foreground mt-1">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
