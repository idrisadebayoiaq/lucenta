"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { UnsafeUrlError } from "@/lib/analyzer/safe-fetch";
import { generateApiKey, generateWebhookSecret, MAX_ACTIVE_KEYS } from "@/lib/api/keys";
import { assertWebhookUrl, deliverWebhook } from "@/lib/api/webhooks";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/server";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const PATH = "/dashboard/api";

export async function createApiKey(name: string): Promise<Result<{ key: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You are not signed in." };

  const parsed = z.string().trim().min(1, "Give the key a name.").max(60, "Keep the name under 60 characters.").safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const admin = createAdminClient();
  const { count } = await admin
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("revoked_at", null);
  if ((count ?? 0) >= MAX_ACTIVE_KEYS) return { ok: false, error: `You can have up to ${MAX_ACTIVE_KEYS} active keys. Revoke one first.` };

  const { key, prefix, hash } = generateApiKey();
  const { error } = await admin.from("api_keys").insert({ user_id: user.id, name: parsed.data, prefix, key_hash: hash });
  if (error) return { ok: false, error: "Could not create the key. Please try again." };
  revalidatePath(PATH);
  return { ok: true, key };
}

export async function revokeApiKey(id: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You are not signed in." };
  const { error } = await createAdminClient()
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("revoked_at", null);
  if (error) return { ok: false, error: "Could not revoke the key. Please try again." };
  revalidatePath(PATH);
  return { ok: true };
}

export async function saveWebhook(url: string, enabled: boolean): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You are not signed in." };

  const value = url.trim();
  if (value.length > 2048) return { ok: false, error: "That URL is too long." };
  try {
    await assertWebhookUrl(value);
  } catch (e) {
    return { ok: false, error: e instanceof UnsafeUrlError ? e.message : "Enter a valid https URL." };
  }

  const admin = createAdminClient();
  const { data: existing } = await admin.from("api_webhooks").select("secret").eq("user_id", user.id).maybeSingle();
  const { error } = await admin.from("api_webhooks").upsert(
    { user_id: user.id, url: value, enabled, secret: existing?.secret ?? generateWebhookSecret(), updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: "Could not save the webhook. Please try again." };
  revalidatePath(PATH);
  return { ok: true };
}

export async function rotateWebhookSecret(): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You are not signed in." };
  const { error } = await createAdminClient()
    .from("api_webhooks")
    .update({ secret: generateWebhookSecret(), updated_at: new Date().toISOString() })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Could not rotate the secret. Please try again." };
  revalidatePath(PATH);
  return { ok: true };
}

export async function deleteWebhook(): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You are not signed in." };
  const { error } = await createAdminClient().from("api_webhooks").delete().eq("user_id", user.id);
  if (error) return { ok: false, error: "Could not remove the webhook. Please try again." };
  revalidatePath(PATH);
  return { ok: true };
}

export async function sendTestWebhook(): Promise<Result<{ status: number | null }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You are not signed in." };
  const result = await deliverWebhook(user.id, "test", { message: "This is a test event from Lucenta." }, { force: true });
  revalidatePath(PATH);
  if (!result) return { ok: false, error: "Save a webhook URL first." };
  if (result.error) return { ok: false, error: result.error };
  return { ok: true, status: result.status };
}
