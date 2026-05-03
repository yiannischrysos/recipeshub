import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChefAvatar } from "@/components/ChefAvatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Ban,
  ShieldOff,
  Check,
  X,
  MessageSquarePlus,
  Plus,
  Users,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { blockUser, getOrCreateConversation, unblockUser } from "@/lib/messaging";
import {
  ChatBubble,
  type ChatMessage,
  type ChatProfile,
  nameOf,
} from "@/components/chat/ChatBubble";
import { ChatComposer } from "@/components/chat/ChatComposer";
import {
  snapshotIngredient,
  snapshotRecipe,
  type IngredientSnapshot,
  type RecipeSnapshot,
} from "@/lib/share-content";
import { useTypingChannel } from "@/lib/typing-channel";

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

type DbMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  shared_recipe_id: string | null;
  shared_recipe_snapshot: RecipeSnapshot | null;
  shared_ingredient_snapshot: IngredientSnapshot | null;
  reply_to_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  read_at: string | null;
  created_at: string;
};

function toChatMessage(m: DbMessage): ChatMessage {
  return {
    id: m.id,
    sender_id: m.sender_id,
    content: m.content,
    created_at: m.created_at,
    edited_at: m.edited_at,
    deleted_at: m.deleted_at,
    reply_to_id: m.reply_to_id,
    shared_recipe_id: m.shared_recipe_id,
    shared_recipe_snapshot: m.shared_recipe_snapshot,
    shared_ingredient_snapshot: m.shared_ingredient_snapshot,
    read_at: m.read_at,
  };
}

function MessagesPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ChatProfile>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [blocks, setBlocks] = useState<{ iBlocked: Set<string>; blockedMe: Set<string> }>({
    iBlocked: new Set(),
    blockedMe: new Set(),
  });
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [friendList, setFriendList] = useState<ChatProfile[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  // Load conversations + related profiles + blocks
  const loadAll = async () => {
    if (!user) return;
    const [{ data: cs }, { data: bs }] = await Promise.all([
      supabase
        .from("conversations")
        .select("*")
        .order("last_message_at", { ascending: false }),
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
      const map: Record<string, ChatProfile> = {};
      (ps ?? []).forEach((p) => (map[p.id] = p as ChatProfile));
      setProfiles(map);
    }
    const iBlocked = new Set<string>();
    const blockedMe = new Set<string>();
    (bs ?? []).forEach((b) => {
      if (b.blocker_id === user.id) iBlocked.add(b.blocked_id);
      else if (b.blocked_id === user.id) blockedMe.add(b.blocker_id);
    });
    setBlocks({ iBlocked, blockedMe });

    // Unread counts (messages addressed to me with no read_at)
    if (list.length) {
      const ids = list.map((c) => c.id);
      const { data: ur } = await supabase
        .from("messages")
        .select("conversation_id,sender_id,read_at")
        .in("conversation_id", ids)
        .is("read_at", null);
      const counts: Record<string, number> = {};
      (ur ?? []).forEach((m) => {
        if (m.sender_id !== user.id) {
          counts[m.conversation_id] = (counts[m.conversation_id] ?? 0) + 1;
        }
      });
      setUnread(counts);
    } else {
      setUnread({});
    }
  };

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  // Realtime: conversations + global new-message notifier
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("dm-global")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => loadAll(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => loadAll(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  // Load messages + realtime for active conversation
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
      .then(({ data }) => setMessages((data ?? []) as DbMessage[]));

    const ch = supabase
      .channel(`messages-${activeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => setMessages((m) => [...m, payload.new as DbMessage]),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => {
          const upd = payload.new as DbMessage;
          setMessages((m) => m.map((x) => (x.id === upd.id ? upd : x)));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => {
          const del = payload.old as { id: string };
          setMessages((m) => m.filter((x) => x.id !== del.id));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [activeId]);

  // Auto-scroll to bottom on new message / open
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  }, [messages.length, activeId]);

  // Mark incoming messages as read once viewed
  useEffect(() => {
    if (!user || !activeId) return;
    const unreadIds = messages
      .filter((m) => m.sender_id !== user.id && !m.read_at)
      .map((m) => m.id);
    if (unreadIds.length === 0) return;
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds)
      .then(() => {
        setUnread((u) => ({ ...u, [activeId]: 0 }));
      });
  }, [messages, activeId, user]);

  // Friends for new chat dialog
  const openNewChat = async () => {
    if (!user) return;
    setNewChatOpen(true);
    const { data: fr } = await supabase
      .from("friendships")
      .select("user_a,user_b")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
    const friendIds = (fr ?? []).map((f) =>
      f.user_a === user.id ? f.user_b : f.user_a,
    );
    if (!friendIds.length) {
      setFriendList([]);
      return;
    }
    const { data: ps } = await supabase
      .from("profiles")
      .select("id,display_name,nickname,avatar_url,avatar_icon")
      .in("id", friendIds);
    setFriendList((ps ?? []) as ChatProfile[]);
  };

  const startChat = async (otherId: string) => {
    if (!user) return;
    try {
      const conv = await getOrCreateConversation(user.id, otherId);
      setActiveId(conv.id);
      setNewChatOpen(false);
      await loadAll();
    } catch (e) {
      toast.error((e as Error).message || "Could not start chat");
    }
  };

  const active = useMemo(
    () => convs.find((c) => c.id === activeId) ?? null,
    [convs, activeId],
  );
  const otherId = active
    ? active.user_a === user?.id
      ? active.user_b
      : active.user_a
    : null;
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

  // Typing indicator
  const { typingUsers, notifyTyping } = useTypingChannel(
    activeId ? `dm-typing-${activeId}` : null,
    user?.id ?? null,
  );
  const otherTyping = otherId ? typingUsers.has(otherId) : false;

  const messagesById = useMemo(() => {
    const map: Record<string, ChatMessage> = {};
    messages.forEach((m) => (map[m.id] = toChatMessage(m)));
    return map;
  }, [messages]);

  const send = async (overrides?: Partial<DbMessage>) => {
    if (!user || !active) return;
    const content = overrides?.content !== undefined ? overrides.content : input.trim();
    const isShare = !!(
      overrides?.shared_recipe_id ||
      overrides?.shared_recipe_snapshot ||
      overrides?.shared_ingredient_snapshot
    );
    if (!isShare && !content) return;
    const payload = {
      conversation_id: active.id,
      sender_id: user.id,
      content: isShare ? null : content,
      shared_recipe_id: overrides?.shared_recipe_id ?? null,
      shared_recipe_snapshot: overrides?.shared_recipe_snapshot ?? null,
      shared_ingredient_snapshot: overrides?.shared_ingredient_snapshot ?? null,
      reply_to_id: replyTo?.id ?? null,
    };
    const { error } = await supabase.from("messages").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!isShare) setInput("");
    setReplyTo(null);
  };

  const onShareRecipe = async (recipeId: string) => {
    const snap = await snapshotRecipe(recipeId);
    await send({ shared_recipe_id: recipeId, shared_recipe_snapshot: snap });
  };

  const onShareIngredient = async (ingredientId: string) => {
    const snap = await snapshotIngredient(ingredientId);
    if (!snap) {
      toast.error("Could not load ingredient");
      return;
    }
    await send({ shared_ingredient_snapshot: snap });
  };

  const editMessage = async (m: ChatMessage, newText: string) => {
    const { error } = await supabase
      .from("messages")
      .update({ content: newText, edited_at: new Date().toISOString() })
      .eq("id", m.id);
    if (error) toast.error(error.message);
  };

  const deleteMessage = async (m: ChatMessage) => {
    const { error } = await supabase
      .from("messages")
      .update({
        deleted_at: new Date().toISOString(),
        content: null,
        shared_recipe_id: null,
        shared_recipe_snapshot: null,
        shared_ingredient_snapshot: null,
      })
      .eq("id", m.id);
    if (error) toast.error(error.message);
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

  const jumpToMessage = (id: string) => {
    const node = messageRefs.current[id];
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
    node?.classList.add("ring-2", "ring-primary");
    setTimeout(() => node?.classList.remove("ring-2", "ring-primary"), 1200);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
      </div>
    );
  }

  const showSidebar = !activeId;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-4">
        <Tabs defaultValue="direct">
          <TabsList>
            <TabsTrigger value="direct">Direct</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
          </TabsList>
          <TabsContent value="direct" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-12rem)]">
              {/* Sidebar */}
              <div
                className={`border border-border rounded-lg bg-card flex flex-col ${
                  showSidebar ? "" : "hidden md:flex"
                }`}
              >
                <div className="p-3 border-b border-border flex items-center justify-between">
                  <h2 className="font-semibold">Messages</h2>
                  <Button size="sm" variant="outline" onClick={openNewChat}>
                    <MessageSquarePlus className="h-4 w-4" />
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  {convs.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">
                      No conversations yet.
                    </div>
                  ) : (
                    <ul>
                      {convs.map((c) => {
                        const oid = c.user_a === user.id ? c.user_b : c.user_a;
                        const p = profiles[oid];
                        const pending =
                          c.status === "pending" && c.initiator_id !== user.id;
                        const u = unread[c.id] ?? 0;
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
                                  <ChefAvatar
                                    icon={p.avatar_icon}
                                    className="h-9 w-9"
                                  />
                                ) : (
                                  <AvatarFallback>
                                    {nameOf(p)[0]?.toUpperCase()}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">
                                  {nameOf(p)}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {pending
                                    ? "Wants to message you"
                                    : new Date(c.last_message_at).toLocaleString()}
                                </div>
                              </div>
                              {u > 0 && (
                                <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground tabular-nums">
                                  {u > 99 ? "99+" : u}
                                </span>
                              )}
                              {pending && !u && (
                                <span className="h-2 w-2 rounded-full bg-primary" />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </ScrollArea>
              </div>

              {/* Chat area */}
              <div
                className={`border border-border rounded-lg bg-card flex flex-col ${
                  showSidebar ? "hidden md:flex" : "flex"
                }`}
              >
                {!active ? (
                  <div className="flex-1 grid place-items-center text-muted-foreground">
                    Select a conversation
                  </div>
                ) : (
                  <>
                    <div className="p-3 border-b border-border flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="md:hidden -ml-1"
                          onClick={() => setActiveId(null)}
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <Avatar className="h-9 w-9">
                          {otherProfile?.avatar_url ? (
                            <AvatarImage src={otherProfile.avatar_url} />
                          ) : otherProfile?.avatar_icon ? (
                            <ChefAvatar
                              icon={otherProfile.avatar_icon}
                              className="h-9 w-9"
                            />
                          ) : (
                            <AvatarFallback>
                              {nameOf(otherProfile)[0]?.toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {nameOf(otherProfile)}
                          </div>
                          <div className="text-xs text-muted-foreground h-4">
                            {otherTyping
                              ? "typing…"
                              : theyBlockedMe
                                ? "This user has blocked you"
                                : ""}
                          </div>
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
                          <strong>{nameOf(otherProfile)}</strong> wants to send you
                          a message.
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => respond("declined")}
                          >
                            <X className="h-4 w-4 mr-1" /> Decline
                          </Button>
                          <Button size="sm" onClick={() => respond("accepted")}>
                            <Check className="h-4 w-4 mr-1" /> Accept
                          </Button>
                        </div>
                      </div>
                    )}

                    <div
                      ref={scrollRef}
                      className="flex-1 overflow-y-auto p-4 space-y-3"
                    >
                      {messages.length === 0 ? (
                        <div className="grid place-items-center py-12 text-center">
                          <div className="max-w-sm">
                            <div className="font-medium mb-1">No messages yet</div>
                            <p className="text-sm text-muted-foreground">
                              Say hi to{" "}
                              <strong>{nameOf(otherProfile)}</strong>.
                            </p>
                          </div>
                        </div>
                      ) : (
                        messages.map((m) => {
                          const cm = toChatMessage(m);
                          const mine = m.sender_id === user.id;
                          const replyParent = m.reply_to_id
                            ? (messagesById[m.reply_to_id] ?? null)
                            : null;
                          const replyParentProfile = replyParent
                            ? replyParent.sender_id === user.id
                              ? null
                              : profiles[replyParent.sender_id]
                            : null;
                          return (
                            <ChatBubble
                              key={m.id}
                              msg={cm}
                              mine={mine}
                              scope="dm"
                              meId={user.id}
                              profile={mine ? null : otherProfile}
                              replyParent={replyParent}
                              replyParentProfile={replyParentProfile}
                              onReply={setReplyTo}
                              onEdit={editMessage}
                              onDelete={deleteMessage}
                              onJumpToReply={jumpToMessage}
                              bubbleRef={(el) => {
                                messageRefs.current[m.id] = el;
                              }}
                            />
                          );
                        })
                      )}
                      {otherTyping && (
                        <div className="text-xs text-muted-foreground italic px-1">
                          {nameOf(otherProfile)} is typing…
                        </div>
                      )}
                    </div>

                    <ChatComposer
                      value={input}
                      onChange={setInput}
                      onSend={() => send()}
                      onTyping={notifyTyping}
                      disabled={!canSend}
                      disabledMessage={
                        iBlockedThem
                          ? "You have blocked this user."
                          : theyBlockedMe
                            ? "You can't message this user."
                            : "Waiting for the other user to accept your request…"
                      }
                      replyTo={replyTo}
                      replyToProfile={
                        replyTo
                          ? replyTo.sender_id === user.id
                            ? null
                            : otherProfile
                          : null
                      }
                      onCancelReply={() => setReplyTo(null)}
                      onShareRecipe={onShareRecipe}
                      onShareIngredient={onShareIngredient}
                    />
                  </>
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="groups" className="mt-4">
            <GroupsPanel />
          </TabsContent>
        </Tabs>
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

// ============= GROUPS PANEL =============
type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
};

function GroupsPanel() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const load = async () => {
    if (!user) return;
    const { data: mems } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id);
    const ids = (mems ?? []).map((m) => m.group_id);
    if (ids.length === 0) {
      setGroups([]);
      return;
    }
    const { data } = await supabase
      .from("groups")
      .select("id,name,description,updated_at")
      .in("id", ids)
      .order("updated_at", { ascending: false });
    setGroups((data ?? []) as GroupRow[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const create = async () => {
    if (!user || !name.trim()) return;
    const { data, error } = await supabase
      .from("groups")
      .insert({
        name: name.trim(),
        description: desc.trim() || null,
        owner_id: user.id,
      })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    toast.success("Group created");
    setOpen(false);
    setName("");
    setDesc("");
    nav({ to: "/groups/$id", params: { id: data.id } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> Your groups
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> New group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a group</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Group name"
              />
              <Textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
              />
              <Button onClick={create} className="w-full">
                Create
              </Button>
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
            <Link
              key={g.id}
              to="/groups/$id"
              params={{ id: g.id }}
              className="block rounded-xl border border-border bg-card p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="font-semibold">{g.name}</div>
              {g.description && (
                <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {g.description}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
