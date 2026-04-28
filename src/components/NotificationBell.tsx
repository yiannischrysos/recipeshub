import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, AtSign, UserPlus, UserCheck, MessageCircle, Megaphone, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "@/lib/relative-time";

type Notif = {
  id: string;
  type: "mention" | "friend_request" | "friend_accepted" | "follow" | "dm" | "group_invite" | "announcement";
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

const iconFor = (t: Notif["type"]) => {
  switch (t) {
    case "mention": return <AtSign className="h-4 w-4 text-primary" />;
    case "friend_request": return <UserPlus className="h-4 w-4 text-primary" />;
    case "friend_accepted": return <UserCheck className="h-4 w-4 text-primary" />;
    case "follow": return <UserPlus className="h-4 w-4 text-primary" />;
    case "dm": return <MessageCircle className="h-4 w-4 text-primary" />;
    case "announcement": return <Megaphone className="h-4 w-4 text-primary" />;
    default: return <Bell className="h-4 w-4" />;
  }
};

export function NotificationBell() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data ?? []) as Notif[]);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase
      .channel("notifications-rt")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const unread = items.filter((n) => !n.read_at).length;

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id).is("read_at", null);
    load();
  };

  const click = async (n: Notif) => {
    if (!n.read_at) {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
    }
    setOpen(false);
    if (n.link) nav({ to: n.link });
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="font-semibold text-sm">Notifications</div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              <Check className="h-3 w-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[420px]">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</div>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => click(n)}
                    className={`w-full text-left px-3 py-3 flex items-start gap-3 hover:bg-secondary/50 transition-colors ${
                      !n.read_at ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="mt-0.5">{iconFor(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{n.title}</div>
                      {n.body && <div className="text-xs text-muted-foreground line-clamp-2">{n.body}</div>}
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(n.created_at)}
                      </div>
                    </div>
                    {!n.read_at && <span className="h-2 w-2 rounded-full bg-primary mt-2" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        <div className="border-t border-border px-3 py-2 text-center">
          <Link to="/announcements" onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">
            View all announcements
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
