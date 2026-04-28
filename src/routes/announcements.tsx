import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/lib/auth-context";
import { useIsAdmin } from "@/hooks/use-role";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { timeAgo } from "@/lib/relative-time";

export const Route = createFileRoute("/announcements")({
  component: AnnouncementsPage,
});

type Announcement = {
  id: string;
  title: string;
  body: string;
  category: string;
  author_id: string;
  created_at: string;
};

function AnnouncementsPage() {
  const { user, loading } = useAuth();
  const { isAdmin } = useIsAdmin();
  const nav = useNavigate();
  const [items, setItems] = useState<Announcement[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("update");

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  const load = async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as Announcement[]);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const publish = async () => {
    if (!user || !title.trim() || !body.trim()) return;
    const { error } = await supabase.from("announcements").insert({
      title: title.trim(), body: body.trim(), category, author_id: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Announcement published");
    setOpen(false); setTitle(""); setBody(""); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  if (!user) return <div className="min-h-screen bg-background"><AppHeader /></div>;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl flex items-center gap-2">
              <Megaphone className="h-7 w-7 text-primary" /> Announcements
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Product updates, release notes, and important news.</p>
          </div>
          {isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4" /> New</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Publish announcement</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="update">Product update</option>
                    <option value="release">Release notes</option>
                    <option value="news">News</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                  <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What's new?" rows={6} />
                  <Button onClick={publish} className="w-full">Publish to everyone</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No announcements yet.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((a) => (
              <article key={a.id} className="relative rounded-2xl border border-border bg-gradient-to-br from-card to-card/60 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-primary to-primary/40 rounded-l-2xl" />
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                      {a.category}
                    </span>
                    <span className="text-xs text-muted-foreground">{timeAgo(a.created_at)}</span>
                  </div>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" onClick={() => remove(a.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <h2 className="font-display text-xl font-semibold mb-2">{a.title}</h2>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{a.body}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
