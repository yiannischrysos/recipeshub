import { useState, type ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChefAvatar } from "@/components/ChefAvatar";
import { MessageReactions } from "@/components/MessageReactions";
import {
  SharedRecipeCard,
  SharedIngredientCard,
} from "@/components/chat/SharedCards";
import {
  Reply,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  X,
  CheckCheck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AutoTextarea } from "@/components/AutoTextarea";
import { Button } from "@/components/ui/button";
import type {
  IngredientSnapshot,
  RecipeSnapshot,
} from "@/lib/share-content";

export type ChatProfile = {
  id: string;
  display_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  avatar_icon: string | null;
};

export type ChatMessage = {
  id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  reply_to_id: string | null;
  shared_recipe_id: string | null;
  shared_recipe_snapshot: RecipeSnapshot | null;
  shared_ingredient_snapshot: IngredientSnapshot | null;
  read_at?: string | null; // dm only
  mentions?: string[]; // group only
};

function nameOf(p?: ChatProfile | null) {
  return p?.nickname || p?.display_name || "User";
}

export function ChatBubble({
  msg,
  mine,
  scope,
  meId,
  profile,
  replyParent,
  replyParentProfile,
  onReply,
  onEdit,
  onDelete,
  onJumpToReply,
  showSenderName,
  highlightMention,
  bubbleRef,
  renderContent,
}: {
  msg: ChatMessage;
  mine: boolean;
  scope: "dm" | "group";
  meId: string;
  profile?: ChatProfile | null;
  replyParent?: ChatMessage | null;
  replyParentProfile?: ChatProfile | null;
  onReply: (m: ChatMessage) => void;
  onEdit: (m: ChatMessage, newText: string) => Promise<void>;
  onDelete: (m: ChatMessage) => Promise<void>;
  onJumpToReply?: (id: string) => void;
  showSenderName?: boolean;
  highlightMention?: boolean;
  bubbleRef?: (el: HTMLDivElement | null) => void;
  renderContent?: (text: string) => ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(msg.content ?? "");

  const deleted = !!msg.deleted_at;
  const isShare = !!(
    msg.shared_recipe_snapshot ||
    msg.shared_recipe_id ||
    msg.shared_ingredient_snapshot
  );
  const canEdit = mine && !deleted && !isShare;
  const canDelete = mine && !deleted;

  const saveEdit = async () => {
    const text = draft.trim();
    if (!text || text === msg.content) {
      setEditing(false);
      return;
    }
    await onEdit(msg, text);
    setEditing(false);
  };

  return (
    <div
      ref={bubbleRef}
      className={`group flex gap-2 ${mine ? "justify-end" : "justify-start"}`}
    >
      {!mine && scope === "group" && (
        <Avatar className="h-7 w-7 mt-0.5">
          {profile?.avatar_url ? (
            <AvatarImage src={profile.avatar_url} />
          ) : profile?.avatar_icon ? (
            <ChefAvatar icon={profile.avatar_icon} className="h-7 w-7" />
          ) : (
            <AvatarFallback>{nameOf(profile)[0]?.toUpperCase()}</AvatarFallback>
          )}
        </Avatar>
      )}

      <div
        className={`relative max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
          mine
            ? "bg-primary text-primary-foreground"
            : highlightMention
              ? "bg-amber-100 dark:bg-amber-900/30 ring-1 ring-amber-400/40"
              : "bg-secondary text-secondary-foreground"
        }`}
      >
        {showSenderName && !mine && scope === "group" && (
          <div className="text-[10px] font-semibold opacity-80 mb-0.5">
            {nameOf(profile)}
          </div>
        )}

        {/* Reply preview */}
        {msg.reply_to_id && replyParent && (
          <button
            type="button"
            onClick={() => onJumpToReply?.(msg.reply_to_id!)}
            className={`mb-1.5 block w-full text-left rounded-md px-2 py-1 text-[11px] border-l-2 ${
              mine
                ? "bg-primary-foreground/10 border-primary-foreground/40"
                : "bg-background/60 border-primary/50"
            }`}
          >
            <div className="font-semibold opacity-90 truncate">
              {replyParent.sender_id === meId
                ? "You"
                : nameOf(replyParentProfile)}
            </div>
            <div className="opacity-80 line-clamp-2">
              {replyParent.deleted_at
                ? "Deleted message"
                : replyParent.shared_recipe_snapshot
                  ? `🍳 ${replyParent.shared_recipe_snapshot.name}`
                  : replyParent.shared_ingredient_snapshot
                    ? `🥕 ${replyParent.shared_ingredient_snapshot.name}`
                    : (replyParent.content ?? "")}
            </div>
          </button>
        )}

        {/* Body */}
        {deleted ? (
          <div className="italic opacity-70 text-xs">Message deleted</div>
        ) : msg.shared_recipe_snapshot || msg.shared_recipe_id ? (
          <SharedRecipeCard
            snapshot={msg.shared_recipe_snapshot}
            recipeId={msg.shared_recipe_id}
            mine={mine}
          />
        ) : msg.shared_ingredient_snapshot ? (
          <SharedIngredientCard
            snapshot={msg.shared_ingredient_snapshot}
            userId={meId}
            mine={mine}
          />
        ) : editing ? (
          <div className="space-y-1.5 min-w-[200px]">
            <AutoTextarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="bg-background text-foreground"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit();
                }
                if (e.key === "Escape") {
                  setEditing(false);
                  setDraft(msg.content ?? "");
                }
              }}
            />
            <div className="flex justify-end gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => {
                  setEditing(false);
                  setDraft(msg.content ?? "");
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                className="h-6 w-6"
                onClick={saveEdit}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words">
            {renderContent ? renderContent(msg.content ?? "") : (msg.content ?? "")}
          </div>
        )}

        {/* Footer: time + edited + read receipt */}
        <div
          className={`text-[10px] mt-1 flex items-center gap-1 ${
            mine ? "opacity-70 justify-end" : "text-muted-foreground"
          }`}
        >
          <span>
            {new Date(msg.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {msg.edited_at && !deleted && <span>· edited</span>}
          {mine && scope === "dm" && !deleted && (
            <CheckCheck
              className={`h-3 w-3 ${msg.read_at ? "text-sky-300" : "opacity-60"}`}
            />
          )}
        </div>

        {!deleted && <MessageReactions messageId={msg.id} userId={meId} scope={scope} />}

        {/* Hover actions */}
        {!deleted && !editing && (
          <div
            className={`absolute -top-3 ${mine ? "left-2" : "right-2"} opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5 rounded-full bg-card border border-border px-1 py-0.5 shadow-sm`}
          >
            <button
              onClick={() => onReply(msg)}
              className="p-1 rounded hover:bg-secondary"
              title="Reply"
              type="button"
            >
              <Reply className="h-3 w-3" />
            </button>
            {(canEdit || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-secondary"
                    title="More"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={mine ? "start" : "end"}>
                  {canEdit && (
                    <DropdownMenuItem onClick={() => setEditing(true)}>
                      <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDelete(msg)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export { nameOf };
