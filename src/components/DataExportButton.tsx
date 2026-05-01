import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * GDPR Article 15 (right of access) + Article 20 (data portability).
 * Pulls all user-owned data and downloads as JSON.
 */
export function DataExportButton({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);

  const exportData = async () => {
    setBusy(true);
    try {
      const [profile, recipes, ingredients, recipeSteps, recipeIngredients,
        favoritesR, favoritesI, conversations, messages, groupMessages,
        notifications, consents, presence] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("recipes").select("*").eq("user_id", userId),
        supabase.from("ingredients").select("*").eq("user_id", userId),
        supabase.from("recipe_steps").select("*"),
        supabase.from("recipe_ingredients").select("*"),
        supabase.from("favorite_recipes").select("*").eq("user_id", userId),
        supabase.from("favorite_ingredients").select("*").eq("user_id", userId),
        supabase.from("conversations").select("*").or(`user_a.eq.${userId},user_b.eq.${userId}`),
        supabase.from("messages").select("*").eq("sender_id", userId),
        supabase.from("group_messages").select("*").eq("sender_id", userId),
        supabase.from("notifications").select("*").eq("user_id", userId),
        supabase.from("legal_consents").select("*").eq("user_id", userId),
        supabase.from("user_presence").select("*").eq("user_id", userId).maybeSingle(),
      ]);

      const payload = {
        exported_at: new Date().toISOString(),
        user_id: userId,
        format_version: "1.0",
        data: {
          profile: profile.data,
          recipes: recipes.data ?? [],
          recipe_steps: recipeSteps.data ?? [],
          recipe_ingredients: recipeIngredients.data ?? [],
          ingredients: ingredients.data ?? [],
          favorite_recipes: favoritesR.data ?? [],
          favorite_ingredients: favoritesI.data ?? [],
          conversations: conversations.data ?? [],
          messages_sent: messages.data ?? [],
          group_messages_sent: groupMessages.data ?? [],
          notifications: notifications.data ?? [],
          legal_consents: consents.data ?? [],
          presence: presence.data,
        },
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recipeshub-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Your data was exported.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Export failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" onClick={exportData} disabled={busy}>
      <Download className="h-4 w-4 mr-2" />
      {busy ? "Preparing…" : "Export my data"}
    </Button>
  );
}
