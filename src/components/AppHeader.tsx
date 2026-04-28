import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useIsAdmin } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { ChefHat, LogOut, User, Shield } from "lucide-react";

export function AppHeader() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const loc = useLocation();
  const nav = useNavigate();

  const link = (to: string, label: string) => {
    const active = loc.pathname === to || (to !== "/" && loc.pathname.startsWith(to));
    return (
      <Link
        to={to}
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          active
            ? "bg-secondary text-secondary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="border-b border-border bg-card/70 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center">
            <ChefHat className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight">RecipesHub</span>
        </Link>

        {user && (
          <nav className="hidden md:flex items-center gap-1">
            {link("/recipes", "Recipes")}
            {link("/ingredients", "Ingredients")}
            {link("/messages", "Messages")}
            {link("/profile", "Profile")}
            {isAdmin && link("/admin", "Admin")}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                to="/profile"
                className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <User className="h-4 w-4" />
                {user.email}
              </Link>
              {isAdmin && (
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                  <Shield className="h-3 w-3" /> Admin
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOut();
                  nav({ to: "/auth" });
                }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => nav({ to: "/auth" })}>
              Sign in
            </Button>
          )}
        </div>
      </div>
      {user && (
        <nav className="md:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto">
          {link("/recipes", "Recipes")}
          {link("/ingredients", "Ingredients")}
          {link("/messages", "Messages")}
          {link("/profile", "Profile")}
          {isAdmin && link("/admin", "Admin")}
        </nav>
      )}
    </header>
  );
}
