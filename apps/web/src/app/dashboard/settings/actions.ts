"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export type SettingsState = { success?: string; error?: string };

export async function updatePreferences(_: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You are not signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      save_history: formData.get("save_history") === "on",
      email_notifications: formData.get("email_notifications") === "on",
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return { success: "Preferences saved." };
}
