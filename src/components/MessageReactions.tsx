import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Smile } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const EMOJIS = ["👍", "👎", "❤️", "😂", "🎉", "😮"];

type Reaction = { id: string; emoji: string; user_id: string };

type Props = {
  messageId: string;
  userId: string;
  /** "dm" -> message_reactions, "group" -> group_message_reactions */
  scope: "dm" | "group";
};

export function MessageReactions({ messageId, userId, scope }: Props) {
  const table = scope === "dm" ? "message_reactions" : "group_message_reactions";
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (scope === "dm") {
      const { data } = await supabase.from("message_reactions").select("id,emoji,user_id").eq("message_id", messageId);
      setReactions((data ?? []) as Reaction[]);
    } else {
      const { data } = await supabase.from("group_message_reactions").select("id,emoji,user_id").eq("message_id", messageId);
      setReactions((data ?? []) as Reaction[]);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [messageId]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel(`react-${scope}-${messageId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table, filter: `message_id=eq.${messageId}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    /* eslint-disable-next-line */
  }, [messageId]);

  const toggle = async (emoji: string) => {
    const mine = reactions.find((r) => r.user_id === userId && r.emoji === emoji);
    if (mine) {
      if (scope === "dm") {
        await supabase.from("message_reactions").delete().eq("id", mine.id);
      } else {
        await supabase.from("group_message_reactions").delete().eq("id", mine.id);
      }
      setReactions((rs) => rs.filter((r) => r.id !== mine.id));
    } else {
      if (scope === "dm") {
        await supabase.from("message_reactions").insert({ message_id: messageId, user_id: userId, emoji });
      } else {
        await supabase.from("group_message_reactions").insert({ message_id: messageId, user_id: userId, emoji });
      }
      load();
    }
    setOpen(false);
  };

  // Group reactions by emoji
  const grouped = reactions.reduce<Record<string, Reaction[]>>((acc, r) => {
    (acc[r.emoji] ??= []).push(r);
    return acc;
  }, {});
  const entries = Object.entries(grouped);

  return (
    <div className="mt-1 flex items-center gap-1 flex-wrap">
      {entries.map(([emoji, rs]) => {
        const mine = rs.some((r) => r.user_id === userId);
        return (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            className={cn(
              "text-xs rounded-full border px-1.5 py-0.5 leading-none transition",
              mine
                ? "bg-primary/15 border-primary/40 text-foreground"
                : "bg-background/60 border-border hover:bg-secondary",
            )}
            title={`${rs.length} reaction${rs.length === 1 ? "" : "s"}`}
          >
            <span className="mr-1">{emoji}</span>
            <span className="tabular-nums">{rs.length}</span>
          </button>
        );
      })}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="text-xs rounded-full border border-dashed border-border px-1.5 py-0.5 leading-none opacity-60 hover:opacity-100"
            title="Add reaction"
          >
            <Smile className="h-3 w-3 inline" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-1 w-auto" side="top" align="start">
          <div className="flex gap-0.5">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => toggle(e)}
                className="h-8 w-8 rounded hover:bg-secondary text-base"
              >
                {e}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
