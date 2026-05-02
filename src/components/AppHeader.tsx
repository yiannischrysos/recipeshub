import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useIsAdmin, useUserRole, roleBadgeClass, roleLabel } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChefHat, LogOut, User, Shield, Star, MoreHorizontal,
  BookOpen, Carrot, Heart, MessageCircle, Tag, ShieldCheck,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";

export function AppHeader() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { role } = useUserRole();
  const loc = useLocation();
  const nav = useNavigate();

  const isActive = (to: string) =>
    loc.pathname === to || (to !== "/" && loc.pathname.startsWith(to));

  const primary: Array<{ to: string; label: string; icon: typeof BookOpen }> = [
    { to: "/recipes", label: "Recipes", icon: BookOpen },
    { to: "/ingredients", label: "Ingredients", icon: Carrot },
    { to: "/favorites", label: "Favorites", icon: Heart },
    { to: "/messages", label: "Messages", icon: MessageCircle },
  ];

  const link = (to: string, label: string, Icon?: typeof BookOpen) => {
    const active = isActive(to);
    return (
      <Link
        key={to}
        to={to}
        className={`px-3 py-2 rounded-md text-sm font-medium inline-flex items-center gap-1.5 transition-colors ${
          active
            ? "bg-secondary text-secondary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
        }`}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </Link>
    );
  };

  return (
    <header className="border-b border-border bg-card/70 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center">
            <ChefHat className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight hidden sm:inline">RecipesHub</span>
        </Link>

        {user && (
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {primary.map((p) => link(p.to, p.label, p.icon))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="ml-1 text-sm font-medium">More</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>App</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => nav({ to: "/pricing" })}>
                  <Tag className="h-4 w-4 mr-2" /> Pricing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav({ to: "/profile" })}>
                  <User className="h-4 w-4 mr-2" /> Profile
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Admin</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => nav({ to: "/admin" })}>
                      <ShieldCheck className="h-4 w-4 mr-2" /> Admin panel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => nav({ to: "/announcements" })}>
                      <Star className="h-4 w-4 mr-2" /> Post update
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              <ThemeToggle />
              <NotificationBell />
              {isAdmin ? (
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                  <Shield className="h-3 w-3" /> Admin
                </span>
              ) : (
                <span className={`hidden sm:inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${roleBadgeClass(role)}`}>
                  {role === "business" ? <Star className="h-3 w-3" /> : null}
                  {roleLabel(role)}
                </span>
              )}
              <Link to="/profile" className="hidden sm:inline-flex" title={user.email ?? "Profile"}>
                <Button variant="ghost" size="icon">
                  <User className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await signOut();
                  nav({ to: "/auth" });
                }}
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <ThemeToggle />
              <Button size="sm" onClick={() => nav({ to: "/auth" })}>
                Sign in
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mobile primary nav */}
      {user && (
        <nav className="md:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto">
          {primary.map((p) => link(p.to, p.label, p.icon))}
          {link("/profile", "Profile", User)}
          {link("/pricing", "Pricing", Tag)}
          {isAdmin && link("/admin", "Admin", ShieldCheck)}
        </nav>
      )}
    </header>
  );
}
