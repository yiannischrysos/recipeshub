import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { BookOpen, Calculator, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && user) nav({ to: "/recipes" });
  }, [loading, user, nav]);

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(60% 60% at 80% 0%, oklch(0.85 0.08 60 / 0.5), transparent 60%), radial-gradient(50% 50% at 0% 100%, oklch(0.78 0.11 60 / 0.35), transparent 60%)",
        }}
      />
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> For pastry & bakery chefs
          </span>
          <h1 className="mt-6 font-display text-5xl md:text-7xl font-semibold leading-[1.05] text-foreground">
            Your recipe book,
            <br />
            <span className="italic text-primary">costed to the gram.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl">
            Build your ingredient library, save your recipes, and instantly know what each
            portion costs — and what to charge for it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => nav({ to: "/auth" })}>
              Get started
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/auth">I already have an account</Link>
            </Button>
          </div>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3">
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
      </section>
    </div>
  );
}
