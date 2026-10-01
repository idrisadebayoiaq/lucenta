import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  checkSignupAllowed,
  findQuotaOwner,
  getDeviceContext,
  hasRecordedDevice,
  linkQuota,
  recordDevice,
} from "@/lib/account-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000;

export function safeNext(value: string | null, fallback = "/dashboard") {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

// Shared by the OAuth callback and email links: device checks, then onboarding or the requested page.
export async function finishSignIn(supabase: SupabaseClient<Database>, user: User, next: string, origin: string, provider: "google" | "signup") {
  const device = await getDeviceContext();
  const isNewAccount = Date.now() - new Date(user.created_at).getTime() < NEW_ACCOUNT_WINDOW_MS && !(await hasRecordedDevice(user.id));

  if (isNewAccount) {
    const guard = await checkSignupAllowed(device, user.id);
    if (!guard.allowed) {
      await supabase.auth.signOut();
      await createAdminClient().auth.admin.deleteUser(user.id);
      return `${origin}/login?error=${encodeURIComponent(guard.message)}`;
    }
    const quotaOwner = await findQuotaOwner(device, user.id);
    await recordDevice(device, user.id, provider);
    if (quotaOwner) await linkQuota(user.id, quotaOwner);
  } else {
    await recordDevice(device, user.id, "login").catch((e) => console.error("Failed to record login device", e));
  }

  if (next !== "/reset-password") {
    const { data: profile } = await supabase.from("profiles").select("birth_date, occupation, referral_source").eq("id", user.id).single();
    if (!profile?.birth_date || !profile.occupation || !profile.referral_source) {
      return `${origin}/onboarding?next=${encodeURIComponent(next)}`;
    }
  }
  return `${origin}${next}`;
}
