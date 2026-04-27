import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChefHat, KeyRound } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(false);

  // Supabase places a recovery session in the URL hash. The client picks it up
  // automatically via detectSessionInUrl. We confirm a session exists before
  // letting the user set a new password.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Give Supabase a beat to parse the hash on first mount.
      await new Promise((r) => setTimeout(r, 50));
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setReady(true);
      } else {
        toast.error("Reset link is invalid or expired. Please request a new one.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) return toast.error("Password must be at least 6 characters");
    if (pwd !== pwd2) return toast.error("Passwords do not match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated. You're signed in.");
    nav({ to: "/recipes" });
  };

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex items-center justify-center gap-2 text-primary mb-2">
          <ChefHat className="h-6 w-6" />
          <span className="font-display text-lg">RecipesHub</span>
        </div>
        <h1 className="font-display text-3xl text-center">Set a new password</h1>
        <p className="text-center text-sm text-muted-foreground mt-1">
          Choose something you&apos;ll remember.
        </p>

        {ready ? (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pwd">New password</Label>
              <Input
                id="pwd"
                type="password"
                required
                minLength={6}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwd2">Confirm new password</Label>
              <Input
                id="pwd2"
                type="password"
                required
                minLength={6}
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              <KeyRound className="h-4 w-4 mr-1" />
              {busy ? "Updating…" : "Update password"}
            </Button>
          </form>
        ) : (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Validating your reset link…</p>
            <p className="mt-4">
              <Link to="/auth" className="text-primary underline-offset-4 hover:underline">
                Back to sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
