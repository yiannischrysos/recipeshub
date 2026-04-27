import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useIsAdmin, roleBadgeClass, roleLabel, type AppRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, Search, Eye } from "lucide-react";
import { ChefAvatar } from "@/components/ChefAvatar";
import { lastSeenLabel } from "@/lib/relative-time";

export const Route = createFileRoute("/admin")({ component: AdminPage });

type Row = {
  id: string;
  display_name: string | null;
  nickname: string | null;
  avatar_icon: string | null;
  role: AppRole;
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
      supabase.from("profiles").select("id,display_name,nickname,avatar_icon"),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("user_presence").select("user_id,is_online,last_seen_at"),
    ]);
    const roleMap = new Map<string, Set<string>>();
    (roles ?? []).forEach((r) => {
      const set = roleMap.get(r.user_id) ?? new Set();
      set.add(r.role as string);
      roleMap.set(r.user_id, set);
    });
    const presMap = new Map((presence ?? []).map((p) => [p.user_id, p]));
    const merged: Row[] = (profiles ?? []).map((p) => {
      const pres = presMap.get(p.id);
      const userRoles = roleMap.get(p.id) ?? new Set();
      let role: AppRole = "free";
      if (userRoles.has("admin")) role = "admin";
      else if (userRoles.has("premium")) role = "premium";
      return {
        id: p.id,
        display_name: p.display_name,
        nickname: p.nickname,
        avatar_icon: p.avatar_icon,
        role,
        is_online: pres?.is_online ?? false,
        last_seen_at: pres?.last_seen_at ?? null,
      };
    });
    setRows(merged);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const setUserRole = async (row: Row, newRole: AppRole) => {
    if (newRole === row.role) return;
    if (row.id === user!.id && row.role === "admin" && newRole !== "admin") {
      if (!confirm("Remove your own admin role?")) return;
    }
    // Remove all current non-free roles, then insert new one (free has no row).
    await supabase.from("user_roles").delete().eq("user_id", row.id).in("role", ["admin", "premium", "free", "user"]);
    if (newRole !== "free") {
      const { error } = await supabase.from("user_roles").insert({ user_id: row.id, role: newRole });
      if (error) return toast.error(error.message);
    } else {
      // Re-insert 'free' so the user still has a baseline row
      await supabase.from("user_roles").insert({ user_id: row.id, role: "free" });
    }
    toast.success(`Role set to ${roleLabel(newRole)}`);
    load();
  };

  const filtered = rows.filter((r) =>
    !q.trim() ||
    (r.nickname ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (r.display_name ?? "").toLowerCase().includes(q.toLowerCase())
  );

  const onlineCount = rows.filter((r) => r.is_online).length;
  const adminCount = rows.filter((r) => r.role === "admin").length;
  const premiumCount = rows.filter((r) => r.role === "premium").length;

  if (!user || !isAdmin) return null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl flex items-center gap-2"><Shield className="h-7 w-7 text-primary" /> Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {rows.length} members · {onlineCount} online · {adminCount} admins · {premiumCount} premium
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
                  <button
                    onClick={() => nav({ to: "/profile", search: { u: r.id } })}
                    className="flex items-center gap-3 text-left hover:opacity-80"
                  >
                    <ChefAvatar icon={r.avatar_icon} size={36} />
                    <div>
                      <div className="font-medium">{r.nickname || r.display_name || "—"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.id.slice(0, 8)}…</div>
                    </div>
                  </button>
                </TableCell>
                <TableCell>
                  {r.is_online ? (
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Online now
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {lastSeenLabel(false, r.last_seen_at)}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${roleBadgeClass(r.role)}`}>
                    {roleLabel(r.role)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Select value={r.role} onValueChange={(v) => setUserRole(r, v as AppRole)}>
                      <SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => nav({ to: "/profile", search: { u: r.id } })}
                    >
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>
                  </div>
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
