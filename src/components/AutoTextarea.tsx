import * as React from "react";
import { cn } from "@/lib/utils";

// A textarea that auto-grows to fit its content.
export const AutoTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, value, onChange, ...props }, ref) => {
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null);
  React.useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

  const resize = React.useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  React.useEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      ref={innerRef}
      value={value}
      onChange={(e) => {
        onChange?.(e);
        // Resize after value updates settle.
        requestAnimationFrame(resize);
      }}
      onInput={resize}
      rows={1}
      className={cn(
        "flex w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 leading-relaxed",
        className,
      )}
      {...props}
    />
  );
});
AutoTextarea.displayName = "AutoTextarea";
