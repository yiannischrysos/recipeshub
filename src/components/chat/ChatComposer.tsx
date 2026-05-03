import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Send, X } from "lucide-react";
import { AutoTextarea } from "@/components/AutoTextarea";
import { SharePicker } from "@/components/chat/SharePicker";
import { type ChatMessage, nameOf, type ChatProfile } from "@/components/chat/ChatBubble";

export function ChatComposer({
  value,
  onChange,
  onSend,
  onTyping,
  disabled,
  disabledMessage,
  replyTo,
  replyToProfile,
  onCancelReply,
  onShareRecipe,
  onShareIngredient,
  placeholder,
  inputRef,
  beforeInput,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onTyping?: () => void;
  disabled?: boolean;
  disabledMessage?: string;
  replyTo?: ChatMessage | null;
  replyToProfile?: ChatProfile | null;
  onCancelReply?: () => void;
  onShareRecipe: (id: string) => Promise<void> | void;
  onShareIngredient: (id: string) => Promise<void> | void;
  placeholder?: string;
  inputRef?: (el: HTMLTextAreaElement | null) => void;
  beforeInput?: ReactNode;
}) {
  if (disabled) {
    return (
      <div className="p-3 border-t border-border text-sm text-muted-foreground text-center">
        {disabledMessage ?? "You can't send messages right now."}
      </div>
    );
  }

  return (
    <div className="border-t border-border">
      {replyTo && (
        <div className="px-3 pt-2 pb-1 flex items-start gap-2 border-b border-border bg-secondary/30">
          <div className="flex-1 text-xs border-l-2 border-primary pl-2">
            <div className="font-semibold">
              Replying to{" "}
              {replyTo.sender_id === replyToProfile?.id
                ? nameOf(replyToProfile)
                : nameOf(replyToProfile)}
            </div>
            <div className="opacity-80 line-clamp-2">
              {replyTo.shared_recipe_snapshot
                ? `🍳 ${replyTo.shared_recipe_snapshot.name}`
                : replyTo.shared_ingredient_snapshot
                  ? `🥕 ${replyTo.shared_ingredient_snapshot.name}`
                  : (replyTo.content ?? "")}
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0"
            onClick={onCancelReply}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="p-3 relative">
        {beforeInput}
        <div className="flex items-end gap-2">
          <SharePicker
            onPickRecipe={onShareRecipe}
            onPickIngredient={onShareIngredient}
          />
          <AutoTextarea
            ref={(el) => inputRef?.(el)}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              onTyping?.();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder={placeholder ?? "Type a message…"}
            className="max-h-40"
          />
          <Button onClick={onSend} size="icon" disabled={!value.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
