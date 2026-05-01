import { Link } from "@tanstack/react-router";
import { ChefHat } from "lucide-react";

export function AppFooter() {
  return (
    <footer className="border-t border-border bg-card/50 mt-12">
      <div className="mx-auto max-w-6xl px-6 py-8 grid gap-6 md:grid-cols-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center">
              <ChefHat className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-semibold">RecipesHub</span>
          </div>
          <p className="text-xs text-muted-foreground max-w-xs">
            Manage pastry recipes, ingredients and costing for your bakery.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Product
          </h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/recipes" className="hover:text-primary">Recipes</Link></li>
            <li><Link to="/ingredients" className="hover:text-primary">Ingredients</Link></li>
            <li><Link to="/pricing" className="hover:text-primary">Pricing</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Legal
          </h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/legal/privacy" className="hover:text-primary">Privacy Policy</Link></li>
            <li><Link to="/legal/terms" className="hover:text-primary">Terms of Service</Link></li>
            <li><Link to="/legal/cookies" className="hover:text-primary">Cookies</Link></li>
            <li><Link to="/legal/dpa" className="hover:text-primary">Data Processing</Link></li>
            <li><Link to="/legal/accessibility" className="hover:text-primary">Accessibility</Link></li>
            <li><Link to="/legal/imprint" className="hover:text-primary">Imprint</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-4 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} RecipesHub. All rights reserved.</span>
          <span>Made with care in the EU.</span>
        </div>
      </div>
    </footer>
  );
}
