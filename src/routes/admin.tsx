import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useIsAdmin } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Shield, ShieldOff, Search } from "lucide-react";

export const Route = createFileRoute("/admin")({ component: AdminPage });

type Row = {
  id: string;
  display_name: string | null;
  nickname: string | null;
  is_admin: boolean;
  is_online: boolean;
  last_seen_at: string | null;
};

function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!authLoading && !user) nav({ to: "/auth" });
    if (!roleLoading && user && !isAdmin) nav({ to: "/" });
  }, [authLoading, roleLoading, user, isAdmin, nav]);

  const load = async () => {
    const [{ data: profiles }, { data: roles }, { data: presence }] = await Promise.all([
      supabase.from("profiles").select("id,display_name,nickname"),
      supabase.from("user_roles").select("user_id,role").eq("role", "admin"),
      supabase.from("user_presence").select("user_id,is_online,last_seen_at"),
    ]);
    const adminSet = new Set((roles ?? []).map((r) => r.user_id));
    const presMap = new Map((presence ?? []).map((p) => [p.user_id, p]));
    const merged: Row[] = (profiles ?? []).map((p) => {
      const pres = presMap.get(p.id);
      return {
        id: p.id,
        display_name: p.display_name,
        nickname: p.nickname,
        is_admin: adminSet.has(p.id),
        is_online: pres?.is_online ?? false,
        last_seen_at: pres?.last_seen_at ?? null,
      };
    });
    setRows(merged);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const toggleAdmin = async (row: Row) => {
    if (row.id === user!.id && row.is_admin) {
      if (!confirm("Remove your own admin role?")) return;
    }
    if (row.is_admin) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", row.id).eq("role", "admin");
      if (error) return toast.error(error.message);
      toast.success("Admin role removed");
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: row.id, role: "admin" });
      if (error) return toast.error(error.message);
      toast.success("Admin role granted");
    }
    load();
  };

  const filtered = rows.filter((r) =>
    !q.trim() ||
    (r.nickname ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (r.display_name ?? "").toLowerCase().includes(q.toLowerCase())
  );

  const onlineCount = rows.filter((r) => r.is_online).length;

  if (!user || !isAdmin) return null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl flex items-center gap-2"><Shield className="h-7 w-7 text-primary" /> Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {rows.length} members · {onlineCount} online · {rows.filter((r) => r.is_admin).length} admins
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search members…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <button onClick={() => nav({ to: "/profile", search: { u: r.id } })} className="text-left hover:underline">
                    <div className="font-medium">{r.nickname || r.display_name || "—"}</div>
                    <div className="text-xs text-muted-foreground font-mono">{r.id.slice(0, 8)}…</div>
                  </button>
                </TableCell>
                <TableCell>
                  {r.is_online ? (
                    <span className="inline-flex items-center gap-1.5 text-sm"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Online</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {r.last_seen_at ? `Seen ${new Date(r.last_seen_at).toLocaleDateString()}` : "Never seen"}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {r.is_admin ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                      <Shield className="h-3 w-3" /> Admin
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">User</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant={r.is_admin ? "outline" : "default"} onClick={() => toggleAdmin(r)}>
                    {r.is_admin ? <><ShieldOff className="h-3.5 w-3.5" /> Revoke</> : <><Shield className="h-3.5 w-3.5" /> Make admin</>}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No members found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
