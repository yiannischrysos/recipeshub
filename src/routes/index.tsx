import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Calculator, Sparkles, Croissant, Cookie, CakeSlice,
  IceCream, Wheat, Coffee, ArrowRight, Check,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

const CATEGORIES = [
  { icon: Croissant, label: "Viennoiserie" },
  { icon: CakeSlice, label: "Cakes" },
  { icon: Cookie, label: "Cookies" },
  { icon: IceCream, label: "Desserts" },
  { icon: Wheat, label: "Breads" },
  { icon: Coffee, label: "Beverages" },
];

function Index() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && user) nav({ to: "/recipes" });
  }, [loading, user, nav]);

  return (
    <div className="relative">
      {/* Subtle dotted grid */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, oklch(0.9 0.004 270) 1px, transparent 0)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 70%)",
        }}
      />

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="grid gap-12 md:grid-cols-[1.3fr,1fr] md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> RecipesHub
            </span>
            <h1 className="mt-6 font-display text-6xl md:text-8xl font-normal leading-[1.0] text-foreground">
              Your recipe book,
              <br />
              <span className="italic text-muted-foreground">costed to the gram.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              Build your ingredient library, save your recipes, and instantly
              know what each portion costs — and what to charge for it.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => nav({ to: "/auth" })}>
                Get started <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/auth">I have an account</Link>
              </Button>
            </div>

            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {["Free to start", "No credit card", "Built for chefs"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-primary" /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Sample card preview */}
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-accent/40 to-primary/10 blur-2xl" />
            <div className="rounded-3xl border border-border bg-card/90 backdrop-blur p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Recipe</span>
                <span className="text-[10px] uppercase tracking-widest text-primary">12 portions</span>
              </div>
              <h3 className="mt-2 font-display text-3xl">Almond Croissant</h3>
              <div className="mt-4 space-y-2 text-sm">
                {[
                  ["Butter", "560 g", "€4.20"],
                  ["Flour T55", "1 kg", "€1.85"],
                  ["Almond cream", "300 g", "€3.40"],
                ].map(([n, q, c]) => (
                  <div key={n} className="flex items-center justify-between border-b border-dashed border-border/70 pb-1.5">
                    <span className="text-foreground">{n}</span>
                    <span className="text-muted-foreground">{q}</span>
                    <span className="font-medium tabular-nums">{c}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Per portion</div>
                  <div className="font-display text-2xl">€0.79</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Suggested</div>
                  <div className="font-display text-2xl text-primary">€3.20</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES STRIP */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-3xl md:text-4xl">Every recipe, organized.</h2>
            <p className="text-muted-foreground mt-1">Group by category. Find anything in seconds.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {CATEGORIES.map((c) => (
            <div
              key={c.label}
              className="group rounded-2xl border border-border bg-card/70 hover:bg-card hover:border-primary/40 transition-colors p-4 flex flex-col items-center text-center"
            >
              <div className="h-11 w-11 rounded-xl bg-secondary grid place-items-center text-primary group-hover:scale-105 transition-transform">
                <c.icon className="h-5 w-5" />
              </div>
              <span className="mt-3 text-sm font-medium">{c.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: BookOpen, title: "Recipe library", body: "Categorize, edit and revisit every recipe in one place." },
            { icon: Calculator, title: "Live costing", body: "Each ingredient quantity rolls up into total and per-portion cost." },
            { icon: Sparkles, title: "Smart pricing", body: "Set a target margin — get a suggested selling price instantly." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="h-10 w-10 rounded-xl bg-secondary grid place-items-center text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-xl">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-accent/10 to-transparent p-10 md:p-14 text-center">
          <h2 className="font-display text-3xl md:text-5xl">Start costing your kitchen today.</h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Join chefs who price with confidence. Free to get started.
          </p>
          <div className="mt-6 flex justify-center gap-3 flex-wrap">
            <Button size="lg" onClick={() => nav({ to: "/auth" })}>
              Create your account <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
