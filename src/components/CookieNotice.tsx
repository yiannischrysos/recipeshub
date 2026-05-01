import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { X, Cookie } from "lucide-react";

const KEY = "cookie-notice-dismissed";

export function CookieNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(KEY)) setShow(true);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(KEY, "1");
    setShow(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4 pointer-events-none">
      <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card shadow-lg p-4 flex items-start gap-3 pointer-events-auto">
        <Cookie className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <p className="font-medium">We only use strictly-necessary storage.</p>
          <p className="text-muted-foreground mt-1">
            RecipesHub stores your sign-in session locally so you stay logged in. No tracking,
            no advertising. Read more in our{" "}
            <Link to="/legal/cookies" className="underline hover:text-primary">Cookies notice</Link>{" "}
            and{" "}
            <Link to="/legal/privacy" className="underline hover:text-primary">Privacy Policy</Link>.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={dismiss} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={dismiss}>OK</Button>
      </div>
    </div>
  );
}
