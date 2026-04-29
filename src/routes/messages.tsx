import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChefAvatar } from "@/components/ChefAvatar";
import { Send, Ban, ShieldOff, Check, X, ChefHat, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { blockUser, getOrCreateConversation, unblockUser } from "@/lib/messaging";

export const Route = createFileRoute("/messages")({
  component: MessagesPage,
});

type Conversation = {
  id: string;
  user_a: string;
  user_b: string;
  initiator_id: string;
  status: "pending" | "accepted" | "declined";
  last_message_at: string;
};

type Profile = {
  id: string;
  display_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  avatar_icon: string | null;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  shared_recipe_id: string | null;
  created_at: string;
};

type RecipeLite = { id: string; name: string; category: string | null };

function MessagesPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [blocks, setBlocks] = useState<{ iBlocked: Set<string>; blockedMe: Set<string> }>({
    iBlocked: new Set(),
    blockedMe: new Set(),
  });
  const [recipes, setRecipes] = useState<RecipeLite[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [friendList, setFriendList] = useState<Profile[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  // Load conversations + related profiles + blocks
  const loadAll = async () => {
    if (!user) return;
    const [{ data: cs }, { data: bs }] = await Promise.all([
      supabase.from("conversations").select("*").order("last_message_at", { ascending: false }),
      supabase.from("blocks").select("blocker_id,blocked_id"),
    ]);
    const list = (cs ?? []) as Conversation[];
    setConvs(list);
    const otherIds = Array.from(
      new Set(list.map((c) => (c.user_a === user.id ? c.user_b : c.user_a))),
    );
    if (otherIds.length) {
      const { data: ps } = await supabase
        .from("profiles")
        .select("id,display_name,nickname,avatar_url,avatar_icon")
        .in("id", otherIds);
      const map: Record<string, Profile> = {};
      (ps ?? []).forEach((p) => (map[p.id] = p as Profile));
      setProfiles(map);
    }
    const iBlocked = new Set<string>();
    const blockedMe = new Set<string>();
    (bs ?? []).forEach((b) => {
      if (b.blocker_id === user.id) iBlocked.add(b.blocked_id);
      else if (b.blocked_id === user.id) blockedMe.add(b.blocker_id);
    });
    setBlocks({ iBlocked, blockedMe });
  };

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  // Realtime conversations
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("conversations-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => loadAll())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  // Load messages for active conversation + realtime
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", activeId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data ?? []) as Message[]));

    const ch = supabase
      .channel(`messages-${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` },
        (payload) => setMessages((m) => [...m, payload.new as Message]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, activeId]);

  // Load my recipes (for sharing)
  useEffect(() => {
    if (!user) return;
    supabase
      .from("recipes")
      .select("id,name,category")
      .order("name")
      .then(({ data }) => setRecipes((data ?? []) as RecipeLite[]));
  }, [user]);

  // Load friends for new-chat dialog
  const openNewChat = async () => {
    if (!user) return;
    setNewChatOpen(true);
    const { data: fr } = await supabase
      .from("friendships")
      .select("user_a,user_b")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
    const friendIds = (fr ?? []).map((f) => (f.user_a === user.id ? f.user_b : f.user_a));
    if (!friendIds.length) {
      setFriendList([]);
      return;
    }
    const { data: ps } = await supabase
      .from("profiles")
      .select("id,display_name,nickname,avatar_url,avatar_icon")
      .in("id", friendIds);
    setFriendList((ps ?? []) as Profile[]);
  };

  const startChat = async (otherId: string) => {
    if (!user) return;
    try {
      const conv = await getOrCreateConversation(user.id, otherId);
      setActiveId(conv.id);
      setNewChatOpen(false);
      await loadAll();
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Could not start chat");
    }
  };

  const active = useMemo(() => convs.find((c) => c.id === activeId) ?? null, [convs, activeId]);
  const otherId = active ? (active.user_a === user?.id ? active.user_b : active.user_a) : null;
  const otherProfile = otherId ? profiles[otherId] : null;
  const iBlockedThem = otherId ? blocks.iBlocked.has(otherId) : false;
  const theyBlockedMe = otherId ? blocks.blockedMe.has(otherId) : false;
  const isPendingForMe =
    !!active && active.status === "pending" && active.initiator_id !== user?.id;
  const canSend =
    !!active &&
    !iBlockedThem &&
    !theyBlockedMe &&
    (active.status === "accepted" || active.initiator_id === user?.id);

  const send = async (recipeId?: string) => {
    if (!user || !active) return;
    const content = recipeId ? null : input.trim();
    if (!recipeId && !content) return;
    const { error } = await supabase.from("messages").insert({
      conversation_id: active.id,
      sender_id: user.id,
      content,
      shared_recipe_id: recipeId ?? null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!recipeId) setInput("");
  };

  const respond = async (status: "accepted" | "declined") => {
    if (!active) return;
    const { error } = await supabase
      .from("conversations")
      .update({ status })
      .eq("id", active.id);
    if (error) return toast.error(error.message);
    toast.success(status === "accepted" ? "Request accepted" : "Request declined");
    await loadAll();
  };

  const toggleBlock = async () => {
    if (!user || !otherId) return;
    if (iBlockedThem) {
      const { error } = await unblockUser(user.id, otherId);
      if (error) return toast.error(error.message);
      toast.success("User unblocked");
    } else {
      const { error } = await blockUser(user.id, otherId);
      if (error) return toast.error(error.message);
      toast.success("User blocked");
    }
    await loadAll();
  };

  const nameOf = (p?: Profile | null) => p?.nickname || p?.display_name || "User";

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-10rem)]">
          {/* Sidebar */}
          <div className="border border-border rounded-lg bg-card flex flex-col">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold">Messages</h2>
              <Button size="sm" variant="outline" onClick={openNewChat}>
                <MessageSquarePlus className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              {convs.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No conversations yet.</div>
              ) : (
                <ul>
                  {convs.map((c) => {
                    const oid = c.user_a === user.id ? c.user_b : c.user_a;
                    const p = profiles[oid];
                    const pending = c.status === "pending" && c.initiator_id !== user.id;
                    return (
                      <li key={c.id}>
                        <button
                          onClick={() => setActiveId(c.id)}
                          className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-secondary/50 ${
                            activeId === c.id ? "bg-secondary" : ""
                          }`}
                        >
                          <Avatar className="h-9 w-9">
                            {p?.avatar_url ? (
                              <AvatarImage src={p.avatar_url} />
                            ) : p?.avatar_icon ? (
                              <ChefAvatar icon={p.avatar_icon} className="h-9 w-9" />
                            ) : (
                              <AvatarFallback>{nameOf(p)[0]?.toUpperCase()}</AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{nameOf(p)}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {pending ? "Wants to message you" : new Date(c.last_message_at).toLocaleString()}
                            </div>
                          </div>
                          {pending && <span className="h-2 w-2 rounded-full bg-primary" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </div>

          {/* Chat area */}
          <div className="border border-border rounded-lg bg-card flex flex-col">
            {!active ? (
              <div className="flex-1 grid place-items-center text-muted-foreground">
                Select a conversation
              </div>
            ) : (
              <>
                <div className="p-3 border-b border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9">
                      {otherProfile?.avatar_url ? (
                        <AvatarImage src={otherProfile.avatar_url} />
                      ) : otherProfile?.avatar_icon ? (
                        <ChefAvatar
                          icon={otherProfile.avatar_icon}
                          className="h-9 w-9"
                        />
                      ) : (
                        <AvatarFallback>{nameOf(otherProfile)[0]?.toUpperCase()}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{nameOf(otherProfile)}</div>
                      {theyBlockedMe && (
                        <div className="text-xs text-destructive">This user has blocked you</div>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={toggleBlock}>
                    {iBlockedThem ? (
                      <>
                        <ShieldOff className="h-4 w-4 mr-1" /> Unblock
                      </>
                    ) : (
                      <>
                        <Ban className="h-4 w-4 mr-1" /> Block
                      </>
                    )}
                  </Button>
                </div>

                {isPendingForMe && (
                  <div className="p-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
                    <div className="text-sm">
                      <strong>{nameOf(otherProfile)}</strong> wants to send you a message.
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => respond("declined")}>
                        <X className="h-4 w-4 mr-1" /> Decline
                      </Button>
                      <Button size="sm" onClick={() => respond("accepted")}>
                        <Check className="h-4 w-4 mr-1" /> Accept
                      </Button>
                    </div>
                  </div>
                )}

                <ScrollArea className="flex-1">
                  <div ref={scrollRef} className="p-4 space-y-2">
                    {messages.length === 0 ? (
                      <div className="grid place-items-center py-12 text-center">
                        <div className="max-w-sm">
                          <div className="font-medium mb-1">No messages yet</div>
                          <p className="text-sm text-muted-foreground">
                            You don't have any previous messages with{" "}
                            <strong>{nameOf(otherProfile)}</strong>. Want to start a
                            new conversation?
                          </p>
                          {canSend && (
                            <Button
                              size="sm"
                              className="mt-3"
                              onClick={() => {
                                if (!input.trim()) setInput("Hi 👋");
                                setTimeout(() => {
                                  document
                                    .querySelector<HTMLInputElement>('input[placeholder^="Type a message"]')
                                    ?.focus();
                                }, 0);
                              }}
                            >
                              Say hi
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      messages.map((m) => {
                      const mine = m.sender_id === user.id;
                      const recipe = m.shared_recipe_id
                        ? recipes.find((r) => r.id === m.shared_recipe_id)
                        : null;
                      return (
                        <div
                          key={m.id}
                          className={`flex ${mine ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                              mine
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-secondary-foreground"
                            }`}
                          >
                            {m.shared_recipe_id ? (
                              <Link
                                to="/recipes/$id"
                                params={{ id: m.shared_recipe_id }}
                                className="flex items-center gap-2 underline-offset-2 hover:underline"
                              >
                                <ChefHat className="h-4 w-4" />
                                <span className="font-medium">
                                  {recipe?.name ?? "Shared recipe"}
                                </span>
                              </Link>
                            ) : (
                              <div className="whitespace-pre-wrap break-words">{m.content}</div>
                            )}
                            <div
                              className={`text-[10px] mt-1 ${mine ? "opacity-70" : "text-muted-foreground"}`}
                            >
                              {new Date(m.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                            <MessageReactions messageId={m.id} userId={user.id} />
                          </div>
                        </div>
                      );
                    })
                    )}
                  </div>
                </ScrollArea>

                <div className="p-3 border-t border-border">
                  {!canSend ? (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      {iBlockedThem
                        ? "You have blocked this user."
                        : theyBlockedMe
                          ? "You can't message this user."
                          : "Waiting for the other user to accept your request…"}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" title="Share a recipe">
                            <ChefHat className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Share a recipe</DialogTitle>
                          </DialogHeader>
                          <div className="max-h-80 overflow-y-auto space-y-1">
                            {recipes.length === 0 ? (
                              <div className="text-sm text-muted-foreground">
                                You don't have any recipes yet.
                              </div>
                            ) : (
                              recipes.map((r) => (
                                <button
                                  key={r.id}
                                  onClick={async () => {
                                    await send(r.id);
                                    setShareOpen(false);
                                  }}
                                  className="w-full text-left px-3 py-2 rounded-md hover:bg-secondary"
                                >
                                  <div className="font-medium text-sm">{r.name}</div>
                                  {r.category && (
                                    <div className="text-xs text-muted-foreground">{r.category}</div>
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            send();
                          }
                        }}
                        placeholder="Type a message…"
                      />
                      <Button onClick={() => send()} size="icon">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a new chat</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-1">
            {friendList.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No friends yet. Find users from their profile pages.
              </div>
            ) : (
              friendList.map((f) => (
                <button
                  key={f.id}
                  onClick={() => startChat(f.id)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-secondary flex items-center gap-3"
                >
                  <Avatar className="h-8 w-8">
                    {f.avatar_url ? (
                      <AvatarImage src={f.avatar_url} />
                    ) : f.avatar_icon ? (
                      <ChefAvatar icon={f.avatar_icon} className="h-8 w-8" />
                    ) : (
                      <AvatarFallback>{nameOf(f)[0]?.toUpperCase()}</AvatarFallback>
                    )}
                  </Avatar>
                  <span className="text-sm">{nameOf(f)}</span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
