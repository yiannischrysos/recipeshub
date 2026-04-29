import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Check, Star, Crown, Building2 } from "lucide-react";
import { useUserRole } from "@/hooks/use-role";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

type Tier = {
  key: "free" | "premium" | "business";
  name: string;
  price: string;
  blurb: string;
  icon: React.ReactNode;
  features: string[];
  highlight?: boolean;
};

const TIERS: Tier[] = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    blurb: "Everything you need to start costing recipes.",
    icon: <Star className="h-5 w-5" />,
    features: [
      "Unlimited personal recipes & ingredients",
      "Cost & margin calculations",
      "Profile, friends, follows",
      "Direct messaging",
      "Join up to 3 group chats",
    ],
  },
  {
    key: "premium",
    name: "Premium",
    price: "$9 / mo",
    blurb: "For serious cooks and small operators.",
    icon: <Crown className="h-5 w-5" />,
    highlight: true,
    features: [
      "Everything in Free",
      "Unlimited group chats & favorites",
      "Branded PDF exports",
      "Recipe sharing in chat",
      "Priority email support",
    ],
  },
  {
    key: "business",
    name: "Business",
    price: "$29 / mo",
    blurb: "For teams running real kitchens.",
    icon: <Building2 className="h-5 w-5" />,
    features: [
      "Everything in Premium",
      "Multi-seat workspace (coming soon)",
      "Shared ingredient library",
      "Advanced cost & margin analytics",
      "White-label menus & exports",
      "Dedicated onboarding",
    ],
  },
];

function PricingPage() {
  const { role } = useUserRole();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="text-center max-w-2xl mx-auto">
          <h1 className="font-display text-4xl md:text-5xl">Plans built for every kitchen</h1>
          <p className="text-muted-foreground mt-3">
            Start free. Upgrade when you need more power, branding, or a team.
          </p>
        </header>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {TIERS.map((t) => {
            const current = role === t.key;
            return (
              <div
                key={t.key}
                className={`relative rounded-2xl border bg-card p-6 flex flex-col ${
                  t.highlight ? "border-primary shadow-md" : "border-border"
                }`}
              >
                {t.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    Most popular
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="h-9 w-9 rounded-full bg-secondary grid place-items-center">
                    {t.icon}
                  </span>
                  <h2 className="font-display text-2xl">{t.name}</h2>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-display">{t.price}</div>
                  <p className="text-sm text-muted-foreground mt-1">{t.blurb}</p>
                </div>
                <ul className="mt-5 space-y-2.5 text-sm flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {current ? (
                    <Button variant="outline" className="w-full" disabled>
                      Your current plan
                    </Button>
                  ) : (
                    <Button
                      variant={t.highlight ? "default" : "outline"}
                      className="w-full"
                      disabled
                      title="Payments coming soon"
                    >
                      Coming soon
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Payment processing isn't enabled yet. Plan tiers and badges are visible across the app today.
        </p>
      </div>
    </div>
  );
}
