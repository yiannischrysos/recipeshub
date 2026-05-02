import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  BookOpen, Carrot, Heart, MessageCircle, Tag, User as UserIcon,
  ChefHat, ShieldCheck, Star, LogOut,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import { useIsAdmin } from "@/hooks/use-role";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

const main = [
  { title: "Recipes", url: "/recipes", icon: BookOpen },
  { title: "Ingredients", url: "/ingredients", icon: Carrot },
  { title: "Favorites", url: "/favorites", icon: Heart },
  { title: "Messages", url: "/messages", icon: MessageCircle },
];

const account = [
  { title: "Profile", url: "/profile", icon: UserIcon },
  { title: "Pricing", url: "/pricing", icon: Tag },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (p: string) => path === p || (p !== "/" && path.startsWith(p));

  const renderItem = (item: { title: string; url: string; icon: typeof BookOpen }) => (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
        <Link to={item.url} className="flex items-center gap-2">
          <item.icon className="h-4 w-4" />
          {!collapsed && <span>{item.title}</span>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2 px-2 py-1.5">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center shrink-0">
            <ChefHat className="h-4 w-4" />
          </div>
          {!collapsed && (
            <span className="font-display text-lg font-semibold tracking-tight">RecipesHub</span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Workspace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{main.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Account</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{account.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Admin</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItem({ title: "Admin panel", url: "/admin", icon: ShieldCheck })}
                {renderItem({ title: "Announcements", url: "/announcements", icon: Star })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className={`flex items-center gap-1 ${collapsed ? "flex-col" : "justify-between px-2"}`}>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <ThemeToggle />
          </div>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              title="Sign out"
              onClick={async () => {
                await signOut();
                nav({ to: "/auth" });
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
