import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LEGAL_VERSIONS } from "@/lib/legal";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"" | "male" | "female" | "non_binary" | "other" | "prefer_not">("");
  const [showGender, setShowGender] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [showAge, setShowAge] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [confirmAge16, setConfirmAge16] = useState(false);
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);

  const sendReset = async () => {
    const target = forgotEmail.trim();
    if (!target) return toast.error("Enter your email first");
    setForgotBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Check your inbox for a password reset link.");
    setForgotOpen(false);
  };

  useEffect(() => {
    if (user) nav({ to: "/recipes" });
  }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!acceptTerms) throw new Error("You must accept the Terms and Privacy Policy.");
        if (!confirmAge16) throw new Error("You must confirm you are at least 16 years old.");
        // Block under-16 if they provided a birth date
        if (birthDate) {
          const dob = new Date(birthDate);
          const ageMs = Date.now() - dob.getTime();
          const age = ageMs / (365.25 * 24 * 60 * 60 * 1000);
          if (age < 16) throw new Error("You must be at least 16 years old to create an account.");
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/recipes`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error("An account with this email already exists. Please sign in instead.");
        }
        // Persist optional gender / birth_date with their privacy toggles
        if (data.user && (gender || birthDate || showGender || showAge)) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            gender: gender || null,
            show_gender: showGender,
            birth_date: birthDate || null,
            show_age: showAge,
          }, { onConflict: "id" });
        }
        // Record consent (GDPR audit trail)
        if (data.user) {
          const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
          const consents = (["terms", "privacy", "age_16"] as const).map((doc) => ({
            user_id: data.user!.id,
            document: doc,
            version: LEGAL_VERSIONS[doc],
            user_agent: ua,
          }));
          await supabase.from("legal_consents").insert(consents);
        }
        toast.success("Account created. You can sign in now.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        nav({ to: "/recipes" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="font-display text-3xl text-center">Welcome</h1>
        <p className="text-center text-sm text-muted-foreground mt-1">
          Sign in to manage your recipes & costs
        </p>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")} className="mt-6">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <TabsContent value="signup" className="space-y-4 m-0">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Chef Antoine" />
              </div>
              <div className="space-y-2">
                <Label>Gender (optional)</Label>
                <Select value={gender} onValueChange={(v) => setGender(v as typeof gender)}>
                  <SelectTrigger><SelectValue placeholder="Prefer not to say" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non_binary">Non-binary</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>Show gender on my profile</span>
                  <Switch checked={showGender} onCheckedChange={setShowGender} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bday">Date of birth</Label>
                <Input id="bday" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>Show my age on my profile</span>
                  <Switch checked={showAge} onCheckedChange={setShowAge} />
                </div>
                <p className="text-[11px] text-muted-foreground">Used for account security. Never shown unless you opt in.</p>
              </div>
            </TabsContent>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            {mode === "signup" && (
              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                <label className="flex items-start gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={confirmAge16}
                    onCheckedChange={(v) => setConfirmAge16(v === true)}
                    className="mt-0.5"
                  />
                  <span>I confirm I am at least <strong>16 years old</strong>.</span>
                </label>
                <label className="flex items-start gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={acceptTerms}
                    onCheckedChange={(v) => setAcceptTerms(v === true)}
                    className="mt-0.5"
                  />
                  <span>
                    I agree to the{" "}
                    <Link to="/legal/terms" className="underline hover:text-primary" target="_blank">Terms of Service</Link>{" "}
                    and{" "}
                    <Link to="/legal/privacy" className="underline hover:text-primary" target="_blank">Privacy Policy</Link>.
                  </span>
                </label>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>

            {mode === "signin" && (
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotOpen(true);
                }}
                className="block w-full text-center text-xs text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
              >
                Forgot my password
              </button>
            )}
          </form>
        </Tabs>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              Enter the email tied to your account. We&apos;ll email you a link to set a new password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email</Label>
            <Input
              id="forgot-email"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForgotOpen(false)} disabled={forgotBusy}>
              Cancel
            </Button>
            <Button onClick={sendReset} disabled={forgotBusy || !forgotEmail.trim()}>
              {forgotBusy ? "Sending…" : "Send reset link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
