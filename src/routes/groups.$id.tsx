import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChefAvatar } from "@/components/ChefAvatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Send, Settings, Users, StickyNote, Pin, Trash2, UserPlus, Crown, Shield, AtSign, Plus, ChevronDown, Bell,
} from "lucide-react";
import { toast } from "sonner";
import { MessageReactions } from "@/components/MessageReactions";

export const Route = createFileRoute("/groups/$id")({
  component: GroupDetailPage,
});

type Group = { id: string; name: string; description: string | null; owner_id: string };
type Role = {
  id: string; group_id: string; name: string; color: string | null; is_default: boolean;
  can_invite: boolean; can_kick: boolean; can_manage_roles: boolean;
  can_manage_notes: boolean; can_mention_all: boolean; can_edit_group: boolean;
};
type Member = { id: string; user_id: string; role_id: string | null };
type Profile = { id: string; display_name: string | null; nickname: string | null; avatar_url: string | null; avatar_icon: string | null };
type Msg = { id: string; sender_id: string; content: string | null; mentions: string[]; created_at: string };
type Note = { id: string; title: string; content: string; pinned: boolean; author_id: string; updated_at: string };

function nameOf(p?: Profile | null) { return p?.nickname || p?.display_name || "User"; }

function GroupDetailPage() {
  const { id: groupId } = useParams({ from: "/groups/$id" });
  const { user, loading } = useAuth();
  const nav = useNavigate();

  const [group, setGroup] = useState<Group | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [messages, setMessages] = useState<Msg[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [input, setInput] = useState("");
  const [tab, setTab] = useState("chat");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [showJumpDown, setShowJumpDown] = useState(false);
  const [pendingMentions, setPendingMentions] = useState<string[]>([]); // message ids that mention me & are off-screen
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [loading, user, nav]);

  const me = useMemo(() => members.find((m) => m.user_id === user?.id) ?? null, [members, user]);
  const myRole = useMemo(() => (me?.role_id ? roles.find((r) => r.id === me.role_id) : null), [me, roles]);
  const isOwner = !!user && group?.owner_id === user.id;
  const can = (perm: keyof Role) => isOwner || (myRole && myRole[perm]);

  const load = async () => {
    if (!user) return;
    const [{ data: g }, { data: rs }, { data: ms }, { data: ns }] = await Promise.all([
      supabase.from("groups").select("*").eq("id", groupId).maybeSingle(),
      supabase.from("group_roles").select("*").eq("group_id", groupId).order("name"),
      supabase.from("group_members").select("*").eq("group_id", groupId),
      supabase.from("group_notes").select("*").eq("group_id", groupId).order("pinned", { ascending: false }).order("updated_at", { ascending: false }),
    ]);
    setGroup(g as Group | null);
    setRoles((rs ?? []) as Role[]);
    setMembers((ms ?? []) as Member[]);
    setNotes((ns ?? []) as Note[]);

    const ids = Array.from(new Set((ms ?? []).map((m) => m.user_id)));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id,display_name,nickname,avatar_url,avatar_icon").in("id", ids);
      const map: Record<string, Profile> = {};
      (ps ?? []).forEach((p) => (map[p.id] = p as Profile));
      setProfiles(map);
    }

    const { data: msgs } = await supabase
      .from("group_messages").select("id,sender_id,content,mentions,created_at")
      .eq("group_id", groupId).order("created_at", { ascending: true }).limit(200);
    setMessages((msgs ?? []) as Msg[]);
  };

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user, groupId]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`group-${groupId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
        (p) => setMessages((m) => [...m, p.new as Msg]))
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members", filter: `group_id=eq.${groupId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "group_notes", filter: `group_id=eq.${groupId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "group_roles", filter: `group_id=eq.${groupId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, groupId]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages.length, tab]);

  // Detect @mention typing
  const onInputChange = (v: string) => {
    setInput(v);
    const m = v.match(/@(\w*)$/);
    if (m) { setMentionFilter(m[1].toLowerCase()); setMentionOpen(true); }
    else setMentionOpen(false);
  };

  const insertMention = (u: Profile) => {
    const handle = (u.nickname || u.display_name || "user").replace(/\s+/g, "");
    const next = input.replace(/@(\w*)$/, `@${handle} `);
    setInput(next);
    setMentionOpen(false);
    inputRef.current?.focus();
  };

  // Resolve mentions in input -> user_ids based on names
  const resolveMentions = (text: string): string[] => {
    const names = Array.from(text.matchAll(/@(\w+)/g)).map((m) => m[1].toLowerCase());
    if (!names.length) return [];
    return members
      .filter((m) => {
        const p = profiles[m.user_id];
        const handle = (p?.nickname || p?.display_name || "").replace(/\s+/g, "").toLowerCase();
        return handle && names.includes(handle);
      })
      .map((m) => m.user_id);
  };

  const send = async () => {
    if (!user || !input.trim()) return;
    const mentions = resolveMentions(input);
    const { error } = await supabase.from("group_messages").insert({
      group_id: groupId, sender_id: user.id, content: input.trim(), mentions,
    });
    if (error) return toast.error(error.message);
    setInput("");
  };

  if (!user || !group) return <div className="min-h-screen bg-background"><AppHeader /></div>;

  const filteredMentions = members
    .map((m) => profiles[m.user_id])
    .filter((p): p is Profile => !!p)
    .filter((p) => {
      const handle = (p.nickname || p.display_name || "").toLowerCase();
      return handle.includes(mentionFilter);
    })
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl">{group.name}</h1>
            {group.description && <p className="text-sm text-muted-foreground">{group.description}</p>}
          </div>
        </header>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="chat"><Users className="h-4 w-4 mr-1" /> Chat</TabsTrigger>
            <TabsTrigger value="notes"><StickyNote className="h-4 w-4 mr-1" /> Notes</TabsTrigger>
            <TabsTrigger value="members"><Users className="h-4 w-4 mr-1" /> Members</TabsTrigger>
            <TabsTrigger value="manage" disabled={!isOwner && !can("can_manage_roles") && !can("can_edit_group")}>
              <Settings className="h-4 w-4 mr-1" /> Manage
            </TabsTrigger>
          </TabsList>

          {/* CHAT */}
          <TabsContent value="chat" className="mt-4">
            <div className="border border-border rounded-lg bg-card flex flex-col h-[calc(100vh-16rem)]">
              <ScrollArea className="flex-1">
                <div ref={scrollRef} className="p-4 space-y-2">
                  {messages.map((m) => {
                    const mine = m.sender_id === user.id;
                    const p = profiles[m.sender_id];
                    return (
                      <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                        {!mine && (
                          <Avatar className="h-7 w-7">
                            {p?.avatar_url ? <AvatarImage src={p.avatar_url} /> :
                             p?.avatar_icon ? <ChefAvatar icon={p.avatar_icon} className="h-7 w-7" /> :
                             <AvatarFallback>{nameOf(p)[0]?.toUpperCase()}</AvatarFallback>}
                          </Avatar>
                        )}
                        <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                          {!mine && <div className="text-[10px] font-semibold opacity-80 mb-0.5">{nameOf(p)}</div>}
                          <div className="whitespace-pre-wrap break-words">{renderMentions(m.content ?? "", members, profiles, user.id)}</div>
                          <div className={`text-[10px] mt-1 ${mine ? "opacity-70" : "text-muted-foreground"}`}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="p-3 border-t border-border relative">
                {mentionOpen && filteredMentions.length > 0 && (
                  <div className="absolute bottom-full left-3 mb-1 w-64 rounded-md border border-border bg-popover shadow-md p-1 z-10">
                    {filteredMentions.map((p) => (
                      <button key={p.id} onClick={() => insertMention(p)}
                        className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary flex items-center gap-2">
                        <AtSign className="h-3 w-3 text-muted-foreground" />
                        {nameOf(p)}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    ref={inputRef} value={input}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Type a message… use @ to mention"
                  />
                  <Button onClick={send} size="icon"><Send className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* NOTES */}
          <TabsContent value="notes" className="mt-4">
            <NotesPanel
              groupId={groupId}
              notes={notes}
              canManage={!!can("can_manage_notes") || isOwner}
              userId={user.id}
              onChange={load}
            />
          </TabsContent>

          {/* MEMBERS */}
          <TabsContent value="members" className="mt-4 space-y-2">
            {members.map((m) => {
              const p = profiles[m.user_id];
              const r = roles.find((x) => x.id === m.role_id);
              const isThisOwner = m.user_id === group.owner_id;
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <Avatar className="h-9 w-9">
                    {p?.avatar_url ? <AvatarImage src={p.avatar_url} /> :
                     p?.avatar_icon ? <ChefAvatar icon={p.avatar_icon} className="h-9 w-9" /> :
                     <AvatarFallback>{nameOf(p)[0]?.toUpperCase()}</AvatarFallback>}
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-sm flex items-center gap-2">
                      {nameOf(p)}
                      {isThisOwner && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                    </div>
                    {r && <div className="text-xs text-muted-foreground">{r.name}</div>}
                  </div>
                  {(isOwner || can("can_kick")) && !isThisOwner && (
                    <Button variant="ghost" size="sm" onClick={async () => {
                      const { error } = await supabase.from("group_members").delete().eq("id", m.id);
                      if (error) toast.error(error.message); else { toast.success("Removed"); load(); }
                    }}>Remove</Button>
                  )}
                </div>
              );
            })}
          </TabsContent>

          {/* MANAGE */}
          <TabsContent value="manage" className="mt-4 space-y-6">
            <ManagePanel group={group} roles={roles} members={members} profiles={profiles}
              isOwner={isOwner} canInvite={!!can("can_invite") || isOwner}
              canManageRoles={!!can("can_manage_roles") || isOwner}
              canEditGroup={!!can("can_edit_group") || isOwner}
              userId={user.id} onChange={load} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function renderMentions(text: string, members: Member[], profiles: Record<string, Profile>, meId: string) {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (!part.startsWith("@")) return <span key={i}>{part}</span>;
    const handle = part.slice(1).toLowerCase();
    const member = members.find((m) => {
      const p = profiles[m.user_id];
      const h = (p?.nickname || p?.display_name || "").replace(/\s+/g, "").toLowerCase();
      return h === handle;
    });
    if (!member) return <span key={i}>{part}</span>;
    const isMe = member.user_id === meId;
    return (
      <span key={i} className={`font-semibold ${isMe ? "bg-primary/30 px-1 rounded" : "text-primary"}`}>
        {part}
      </span>
    );
  });
}

// ---------------- Notes Panel ----------------
function NotesPanel({ groupId, notes, canManage, userId, onChange }: {
  groupId: string; notes: Note[]; canManage: boolean; userId: string; onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);

  const startNew = () => { setEditing(null); setTitle(""); setContent(""); setPinned(false); setOpen(true); };
  const startEdit = (n: Note) => { setEditing(n); setTitle(n.title); setContent(n.content); setPinned(n.pinned); setOpen(true); };

  const save = async () => {
    if (!title.trim()) return;
    const payload = { group_id: groupId, author_id: userId, title: title.trim(), content, pinned };
    const op = editing
      ? await supabase.from("group_notes").update(payload).eq("id", editing.id)
      : await supabase.from("group_notes").insert(payload);
    if (op.error) return toast.error(op.error.message);
    setOpen(false); onChange();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("group_notes").delete().eq("id", id);
    if (error) toast.error(error.message); else onChange();
  };

  return (
    <div className="space-y-3">
      {canManage && (
        <Button onClick={startNew} size="sm"><Plus className="h-4 w-4" /> New note</Button>
      )}
      {notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">No notes yet.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {notes.map((n) => (
            <div key={n.id} className={`rounded-xl border p-4 bg-card ${n.pinned ? "border-primary/50 shadow-md" : "border-border"}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {n.pinned && <Pin className="h-4 w-4 text-primary" />}
                  <h3 className="font-semibold">{n.title}</h3>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(n)}><Settings className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(n.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                )}
              </div>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{n.content}</p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit note" : "New note"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Content" rows={6} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
              Pin to top
            </label>
          </div>
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------- Manage Panel ----------------
function ManagePanel({ group, roles, members, profiles, isOwner, canInvite, canManageRoles, canEditGroup, userId, onChange }: {
  group: Group; roles: Role[]; members: Member[]; profiles: Record<string, Profile>;
  isOwner: boolean; canInvite: boolean; canManageRoles: boolean; canEditGroup: boolean;
  userId: string; onChange: () => void;
}) {
  const [name, setName] = useState(group.name);
  const [desc, setDesc] = useState(group.description ?? "");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [friendList, setFriendList] = useState<Profile[]>([]);

  const saveGroup = async () => {
    const { error } = await supabase.from("groups").update({ name, description: desc || null }).eq("id", group.id);
    if (error) toast.error(error.message); else { toast.success("Saved"); onChange(); }
  };

  const openInvite = async () => {
    setInviteOpen(true);
    const { data: fr } = await supabase.from("friendships").select("user_a,user_b")
      .or(`user_a.eq.${userId},user_b.eq.${userId}`);
    const ids = (fr ?? []).map((f) => f.user_a === userId ? f.user_b : f.user_a)
      .filter((id) => !members.some((m) => m.user_id === id));
    if (!ids.length) { setFriendList([]); return; }
    const { data } = await supabase.from("profiles").select("id,display_name,nickname,avatar_url,avatar_icon").in("id", ids);
    setFriendList((data ?? []) as Profile[]);
  };

  const invite = async (uid: string, defaultRoleId?: string) => {
    const role = defaultRoleId || roles.find((r) => r.is_default)?.id || null;
    const { error } = await supabase.from("group_members").insert({ group_id: group.id, user_id: uid, role_id: role });
    if (error) toast.error(error.message); else { toast.success("Invited"); onChange(); }
  };

  return (
    <div className="space-y-6">
      {canEditGroup && (
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="font-semibold">Group details</h3>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" />
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" rows={3} />
          <Button onClick={saveGroup} size="sm">Save changes</Button>
        </section>
      )}

      {canInvite && (
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4" /> Invite from your friends</h3>
          <Button onClick={openInvite} size="sm" variant="outline">Choose friends</Button>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Invite friends</DialogTitle></DialogHeader>
              <div className="max-h-80 overflow-y-auto space-y-1">
                {friendList.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No friends to invite.</div>
                ) : friendList.map((f) => (
                  <button key={f.id} onClick={() => invite(f.id)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-secondary flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {f.avatar_url ? <AvatarImage src={f.avatar_url} /> :
                       f.avatar_icon ? <ChefAvatar icon={f.avatar_icon} className="h-8 w-8" /> :
                       <AvatarFallback>{nameOf(f)[0]?.toUpperCase()}</AvatarFallback>}
                    </Avatar>
                    <span className="text-sm">{nameOf(f)}</span>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </section>
      )}

      {canManageRoles && (
        <RolesManager group={group} roles={roles} members={members} profiles={profiles} onChange={onChange} />
      )}
    </div>
  );
}

// ---------------- Roles Manager ----------------
const PERMS: { key: keyof Role; label: string }[] = [
  { key: "can_invite", label: "Invite members" },
  { key: "can_kick", label: "Remove members" },
  { key: "can_manage_roles", label: "Manage roles" },
  { key: "can_manage_notes", label: "Manage notes" },
  { key: "can_mention_all", label: "Mention everyone" },
  { key: "can_edit_group", label: "Edit group details" },
];

function RolesManager({ group, roles, members, profiles, onChange }: {
  group: Group; roles: Role[]; members: Member[]; profiles: Record<string, Profile>; onChange: () => void;
}) {
  const [newRole, setNewRole] = useState("");

  const addRole = async () => {
    if (!newRole.trim()) return;
    const { error } = await supabase.from("group_roles").insert({ group_id: group.id, name: newRole.trim() });
    if (error) toast.error(error.message); else { setNewRole(""); onChange(); }
  };

  const updatePerm = async (role: Role, key: keyof Role, value: boolean) => {
    const { error } = await supabase.from("group_roles").update({ [key]: value } as never).eq("id", role.id);
    if (error) toast.error(error.message); else onChange();
  };

  const renameRole = async (role: Role, name: string) => {
    const { error } = await supabase.from("group_roles").update({ name }).eq("id", role.id);
    if (error) toast.error(error.message); else onChange();
  };

  const deleteRole = async (role: Role) => {
    if (role.is_default) return toast.error("Can't delete the default role");
    const { error } = await supabase.from("group_roles").delete().eq("id", role.id);
    if (error) toast.error(error.message); else onChange();
  };

  const assign = async (memberId: string, roleId: string) => {
    const { error } = await supabase.from("group_members").update({ role_id: roleId }).eq("id", memberId);
    if (error) toast.error(error.message); else onChange();
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-4">
      <h3 className="font-semibold flex items-center gap-2"><Shield className="h-4 w-4" /> Roles & permissions</h3>

      <div className="flex gap-2">
        <Input value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="New role name" />
        <Button onClick={addRole} size="sm"><Plus className="h-4 w-4" /></Button>
      </div>

      <div className="space-y-3">
        {roles.map((r) => (
          <div key={r.id} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                defaultValue={r.name}
                onBlur={(e) => { if (e.target.value !== r.name) renameRole(r, e.target.value); }}
                className="max-w-xs"
              />
              {r.is_default && <span className="text-xs text-muted-foreground">default</span>}
              <div className="flex-1" />
              {!r.is_default && (
                <Button variant="ghost" size="icon" onClick={() => deleteRole(r)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PERMS.map((p) => (
                <label key={p.key} className="flex items-center gap-2 text-xs">
                  <input type="checkbox"
                    checked={!!r[p.key]}
                    onChange={(e) => updatePerm(r, p.key, e.target.checked)} />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-border space-y-2">
        <h4 className="text-sm font-semibold">Assign roles</h4>
        {members.filter((m) => m.user_id !== group.owner_id).map((m) => {
          const p = profiles[m.user_id];
          return (
            <div key={m.id} className="flex items-center gap-2">
              <span className="text-sm flex-1">{nameOf(p)}</span>
              <select
                value={m.role_id ?? ""}
                onChange={(e) => assign(m.id, e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              >
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          );
        })}
      </div>
    </section>
  );
}
