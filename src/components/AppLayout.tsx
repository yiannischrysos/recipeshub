import { Outlet, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

// Routes that should use the sidebar layout (authenticated app surfaces).
const APP_PREFIXES = [
  "/recipes",
  "/ingredients",
  "/favorites",
  "/messages",
  "/profile",
  "/admin",
  "/announcements",
  "/groups",
  "/pricing",
];

// Routes that should use the marketing/legal layout (top header + footer).
const MARKETING_PREFIXES = ["/legal", "/auth", "/reset-password", "/favicons"];

function isAppPath(path: string) {
  return APP_PREFIXES.some((p) => path === p || path.startsWith(p + "/") || path === p);
}
function isMarketingPath(path: string) {
  if (path === "/") return true;
  return MARKETING_PREFIXES.some((p) => path === p || path.startsWith(p + "/") || path === p);
}

export function AppLayout() {
  const { user } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const useSidebar = !!user && isAppPath(path) && !isMarketingPath(path);

  if (useSidebar) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-12 flex items-center gap-2 border-b border-border px-3 sticky top-0 z-20 bg-background/80 backdrop-blur">
              <SidebarTrigger />
              <div className="ml-auto" />
            </header>
            <main className="flex-1 min-w-0">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  // Marketing / legal / auth: refined top header + footer
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <div className="absolute top-3 right-3 z-40 hidden sm:block">
        <ThemeToggle />
      </div>
      <main className="flex-1">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  );
}
