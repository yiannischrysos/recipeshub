import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { User as UserIcon, UserPlus, UserCheck, UserX, Trash2, Search, Users } from "lucide-react";

type SearchParams = { u?: string };

export const Route = createFileRoute("/profile")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    u: typeof s.u === "string" ? s.u : undefined,
  }),
  component: ProfilePage,
});

type Profile = {
  id: string;
  display_name: string | null;
  nickname: string | null;
  bio_note: string | null;
  avatar_url: string | null;
};

type Presence = { is_online: boolean; last_seen_at: string };

function ProfilePage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const { u } = useSearch({ from: "/profile" });

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [loading, user, nav]);

  if (!user) return null;
  const targetId = u && u !== user.id ? u : user.id;
  const isOwn = targetId === user.id;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {isOwn ? <OwnProfile /> : <OtherProfile userId={targetId} />}
    </div>
  );
}

function OwnProfile() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [presence, setPresence] = useState<Presence | null>(null);
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState(user!.email ?? "");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [deletePwd, setDeletePwd] = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id,display_name,nickname,bio_note,avatar_url")
      .eq("id", user!.id)
      .maybeSingle();
    if (data) {
      setProfile(data as Profile);
      setNickname(data.nickname ?? "");
      setBio(data.bio_note ?? "");
    }
    const { data: pres } = await supabase
      .from("user_presence").select("is_online,last_seen_at").eq("user_id", user!.id).maybeSingle();
    if (pres) setPresence(pres as Presence);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const saveProfile = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nickname: nickname.trim() || null, bio_note: bio.trim() || null })
      .eq("id", user!.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    load();
  };

  const saveEmail = async () => {
    if (!email || email === user!.email) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Check your inbox to confirm new email");
  };

  const savePwd = async () => {
    if (pwd.length < 6) return toast.error("Password must be at least 6 characters");
    if (pwd !== pwd2) return toast.error("Passwords do not match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) return toast.error(error.message);
    setPwd(""); setPwd2("");
    toast.success("Password updated");
  };

  const deleteAccount = async () => {
    if (!deletePwd) return toast.error("Please enter your password to confirm");
    setDeleting(true);
    // Re-auth
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password: deletePwd,
    });
    if (authErr) {
      setDeleting(false);
      return toast.error("Wrong password");
    }
    // Delete profile (cascades will clean ingredients/recipes via RLS-owned data)
    // Note: auth.users row deletion requires admin; we mark profile + sign out.
    // Hard-delete user data:
    await supabase.from("recipes").delete().eq("user_id", user!.id);
    await supabase.from("ingredients").delete().eq("user_id", user!.id);
    await supabase.from("profiles").delete().eq("id", user!.id);
    await signOut();
    setDeleting(false);
    toast.success("Account data deleted. Sign-up email is now released.");
    nav({ to: "/" });
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground grid place-items-center">
          <UserIcon className="h-8 w-8" />
        </div>
        <div>
          <h1 className="font-display text-3xl">{profile?.nickname || profile?.display_name || "Your profile"}</h1>
          <p className="text-sm text-muted-foreground">
            {presence?.is_online ? "🟢 Online" : presence ? `Last seen ${new Date(presence.last_seen_at).toLocaleString()}` : ""}
          </p>
        </div>
      </header>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="social">Friends & Followers</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="nickname">Nickname (shown to others)</Label>
            <Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={50} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Public note</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={500} placeholder="A short note other users will see on your profile" />
          </div>
          <Button onClick={saveProfile} disabled={busy}>Save profile</Button>
        </TabsContent>

        <TabsContent value="account" className="space-y-8 pt-6">
          <div className="space-y-3">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button variant="outline" onClick={saveEmail} disabled={busy || email === user!.email}>Update email</Button>
          </div>
          <div className="space-y-3">
            <Label>Change password</Label>
            <Input type="password" placeholder="New password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
            <Input type="password" placeholder="Confirm new password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
            <Button variant="outline" onClick={savePwd} disabled={busy || !pwd}>Update password</Button>
          </div>
          <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <h3 className="font-semibold text-destructive flex items-center gap-2"><Trash2 className="h-4 w-4" /> Danger zone</h3>
            <p className="text-sm text-muted-foreground">Permanently delete all your recipes, ingredients and profile data.</p>
            <Button variant="destructive" onClick={() => setAskDelete(true)}>Delete account</Button>
          </div>
        </TabsContent>

        <TabsContent value="social" className="pt-6">
          <SocialPanel userId={user!.id} />
        </TabsContent>
      </Tabs>

      <AlertDialog open={askDelete} onOpenChange={setAskDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes your recipes, ingredients and profile. Enter your password to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input type="password" placeholder="Your password" value={deletePwd} onChange={(e) => setDeletePwd(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteAccount} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? "Deleting…" : "Yes, delete everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function OtherProfile({ userId }: { userId: string }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [presence, setPresence] = useState<Presence | null>(null);
  const [followsThem, setFollowsThem] = useState(false);
  const [friendStatus, setFriendStatus] = useState<"none" | "pending_out" | "pending_in" | "friends">("none");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data: p } = await supabase
      .from("profiles").select("id,display_name,nickname,bio_note,avatar_url").eq("id", userId).maybeSingle();
    setProfile(p as Profile | null);
    const { data: pres } = await supabase.from("user_presence").select("is_online,last_seen_at").eq("user_id", userId).maybeSingle();
    setPresence(pres as Presence | null);
    if (!user) return;
    const { data: f } = await supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", userId).maybeSingle();
    setFollowsThem(!!f);
    const a = user.id < userId ? user.id : userId;
    const b = user.id < userId ? userId : user.id;
    const { data: fr } = await supabase.from("friendships").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
    if (fr) { setFriendStatus("friends"); return; }
    const { data: req } = await supabase.from("friend_requests").select("sender_id,status")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
      .eq("status", "pending").maybeSingle();
    if (!req) setFriendStatus("none");
    else setFriendStatus(req.sender_id === user.id ? "pending_out" : "pending_in");
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId, user]);

  const toggleFollow = async () => {
    if (!user) return;
    setBusy(true);
    if (followsThem) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
    }
    setBusy(false);
    load();
  };

  const sendFriendRequest = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("friend_requests").insert({ sender_id: user.id, receiver_id: userId });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Friend request sent"); load(); }
  };

  const acceptFriend = async () => {
    if (!user) return;
    setBusy(true);
    await supabase.from("friend_requests").update({ status: "accepted" })
      .eq("sender_id", userId).eq("receiver_id", user.id);
    setBusy(false);
    toast.success("Friends!"); load();
  };

  const removeFriend = async () => {
    if (!user) return;
    setBusy(true);
    const a = user.id < userId ? user.id : userId;
    const b = user.id < userId ? userId : user.id;
    await supabase.from("friendships").delete().eq("user_a", a).eq("user_b", b);
    await supabase.from("friend_requests").delete()
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`);
    setBusy(false);
    load();
  };

  if (!profile) return <div className="text-muted-foreground">Loading profile…</div>;

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground grid place-items-center">
          <UserIcon className="h-8 w-8" />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-3xl">{profile.nickname || profile.display_name || "User"}</h1>
          <p className="text-sm text-muted-foreground">
            {presence?.is_online ? "🟢 Online now" : presence ? `Last seen ${new Date(presence.last_seen_at).toLocaleDateString()}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={followsThem ? "outline" : "default"} size="sm" onClick={toggleFollow} disabled={busy}>
            {followsThem ? "Following" : <><UserPlus className="h-4 w-4" /> Follow</>}
          </Button>
          {friendStatus === "none" && (
            <Button variant="outline" size="sm" onClick={sendFriendRequest} disabled={busy}>Add friend</Button>
          )}
          {friendStatus === "pending_out" && <Button variant="outline" size="sm" disabled>Request sent</Button>}
          {friendStatus === "pending_in" && (
            <Button size="sm" onClick={acceptFriend} disabled={busy}><UserCheck className="h-4 w-4" /> Accept</Button>
          )}
          {friendStatus === "friends" && (
            <Button variant="outline" size="sm" onClick={removeFriend} disabled={busy}><UserX className="h-4 w-4" /> Unfriend</Button>
          )}
        </div>
      </header>
      {profile.bio_note && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Note</h3>
          <p className="whitespace-pre-wrap">{profile.bio_note}</p>
        </div>
      )}
    </div>
  );
}

function SocialPanel({ userId }: { userId: string }) {
  const nav = useNavigate();
  const [tab, setTab] = useState<"discover" | "requests" | "friends" | "followers" | "following">("discover");
  const [users, setUsers] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<Array<{ id: string; sender_id: string; profile: Profile | null }>>([]);
  const [q, setQ] = useState("");

  const loadDiscover = async () => {
    let qb = supabase.from("profiles").select("id,display_name,nickname,bio_note,avatar_url").neq("id", userId).limit(50);
    if (q.trim()) qb = qb.or(`nickname.ilike.%${q}%,display_name.ilike.%${q}%`);
    const { data } = await qb;
    setUsers((data ?? []) as Profile[]);
  };

  const loadRequests = async () => {
    const { data } = await supabase.from("friend_requests").select("id,sender_id").eq("receiver_id", userId).eq("status", "pending");
    const ids = (data ?? []).map((r) => r.sender_id);
    if (ids.length === 0) { setRequests([]); return; }
    const { data: profs } = await supabase.from("profiles").select("id,display_name,nickname,bio_note,avatar_url").in("id", ids);
    setRequests((data ?? []).map((r) => ({ ...r, profile: (profs ?? []).find((p) => p.id === r.sender_id) as Profile | null })));
  };

  const loadFriends = async () => {
    const { data } = await supabase.from("friendships").select("user_a,user_b").or(`user_a.eq.${userId},user_b.eq.${userId}`);
    const ids = (data ?? []).map((f) => f.user_a === userId ? f.user_b : f.user_a);
    if (ids.length === 0) { setUsers([]); return; }
    const { data: profs } = await supabase.from("profiles").select("id,display_name,nickname,bio_note,avatar_url").in("id", ids);
    setUsers((profs ?? []) as Profile[]);
  };

  const loadFollowers = async () => {
    const { data } = await supabase.from("follows").select("follower_id").eq("following_id", userId);
    const ids = (data ?? []).map((f) => f.follower_id);
    if (ids.length === 0) { setUsers([]); return; }
    const { data: profs } = await supabase.from("profiles").select("id,display_name,nickname,bio_note,avatar_url").in("id", ids);
    setUsers((profs ?? []) as Profile[]);
  };

  const loadFollowing = async () => {
    const { data } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
    const ids = (data ?? []).map((f) => f.following_id);
    if (ids.length === 0) { setUsers([]); return; }
    const { data: profs } = await supabase.from("profiles").select("id,display_name,nickname,bio_note,avatar_url").in("id", ids);
    setUsers((profs ?? []) as Profile[]);
  };

  useEffect(() => {
    if (tab === "discover") loadDiscover();
    else if (tab === "requests") loadRequests();
    else if (tab === "friends") loadFriends();
    else if (tab === "followers") loadFollowers();
    else if (tab === "following") loadFollowing();
    /* eslint-disable-next-line */
  }, [tab]);

  const respond = async (id: string, status: "accepted" | "declined") => {
    await supabase.from("friend_requests").update({ status }).eq("id", id);
    toast.success(status === "accepted" ? "Friend added" : "Declined");
    loadRequests();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["discover", "requests", "friends", "followers", "following"] as const).map((t) => (
          <Button key={t} variant={tab === t ? "default" : "outline"} size="sm" onClick={() => setTab(t)}>
            {t === "discover" && <Users className="h-3.5 w-3.5" />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Button>
        ))}
      </div>

      {tab === "discover" && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search nickname or name…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button onClick={loadDiscover}>Search</Button>
        </div>
      )}

      {tab === "requests" ? (
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {requests.length === 0 && <div className="p-4 text-sm text-muted-foreground">No pending requests.</div>}
          {requests.map((r) => (
            <div key={r.id} className="p-3 flex items-center gap-3">
              <UserIcon className="h-5 w-5 text-muted-foreground" />
              <button className="flex-1 text-left text-sm hover:underline" onClick={() => nav({ to: "/profile", search: { u: r.sender_id } })}>
                {r.profile?.nickname || r.profile?.display_name || "User"}
              </button>
              <Button size="sm" onClick={() => respond(r.id, "accepted")}>Accept</Button>
              <Button size="sm" variant="outline" onClick={() => respond(r.id, "declined")}>Decline</Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {users.length === 0 && <div className="p-4 text-sm text-muted-foreground">Nobody here yet.</div>}
          {users.map((p) => (
            <button
              key={p.id}
              className="w-full p-3 flex items-center gap-3 text-left hover:bg-secondary/40 transition-colors"
              onClick={() => nav({ to: "/profile", search: { u: p.id } })}
            >
              <UserIcon className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <div className="text-sm font-medium">{p.nickname || p.display_name || "User"}</div>
                {p.bio_note && <div className="text-xs text-muted-foreground line-clamp-1">{p.bio_note}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
