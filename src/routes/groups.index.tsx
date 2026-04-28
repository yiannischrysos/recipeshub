import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/groups/")({
  component: GroupsListPage,
});

type Group = { id: string; name: string; description: string | null; owner_id: string; updated_at: string };

function GroupsListPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [loading, user, nav]);

  const load = async () => {
    if (!user) return;
    const { data: mems } = await supabase.from("group_members").select("group_id").eq("user_id", user.id);
    const ids = (mems ?? []).map((m) => m.group_id);
    if (ids.length === 0) { setGroups([]); return; }
    const { data } = await supabase.from("groups").select("*").in("id", ids).order("updated_at", { ascending: false });
    setGroups((data ?? []) as Group[]);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const create = async () => {
    if (!user || !name.trim()) return;
    const { data, error } = await supabase.from("groups").insert({
      name: name.trim(), description: desc.trim() || null, owner_id: user.id,
    }).select("id").single();
    if (error) return toast.error(error.message);
    toast.success("Group created");
    setOpen(false); setName(""); setDesc("");
    nav({ to: "/groups/$id", params: { id: data.id } });
  };

  if (!user) return <div className="min-h-screen bg-background"><AppHeader /></div>;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl flex items-center gap-2"><Users className="h-7 w-7 text-primary" /> Groups</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> New group</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create a group</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" />
                <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" rows={3} />
                <Button onClick={create} className="w-full">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            You're not in any groups yet. Create one to get started.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {groups.map((g) => (
              <Link key={g.id} to={"/groups/$id" as any} params={{ id: g.id }} className="block rounded-xl border border-border bg-card p-4 hover:bg-secondary/50 transition-colors">
                <div className="font-semibold">{g.name}</div>
                {g.description && <div className="text-sm text-muted-foreground line-clamp-2 mt-1">{g.description}</div>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
