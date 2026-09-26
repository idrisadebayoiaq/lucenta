"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { aboutYouSchema, STUDENT_OCCUPATION_LOCK_DAYS } from "@/lib/onboarding";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export type SettingsState = {
  success?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export async function updateAboutYou(_: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You are not signed in." };

  const parsed = aboutYouSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      occupation: parsed.data.occupation,
      referral_source: parsed.data.referralSource,
      referral_other: parsed.data.referralSource === "other" ? parsed.data.referralOther : null,
    })
    .eq("id", user.id);

  if (error) {
    const message =
      error.message === "occupation_locked"
        ? `Student accounts can't change occupation within ${STUDENT_OCCUPATION_LOCK_DAYS} days of choosing Student.`
        : error.message;
    return { error: message };
  }
  revalidatePath("/dashboard", "layout");
  return { success: "Your details have been updated." };
}

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
