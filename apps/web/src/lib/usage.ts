import "server-only";
import { createHash } from "node:crypto";
import { DAILY_CONTENT_LIMIT, DAILY_SCAN_LIMIT } from "@/lib/limits";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export function utcToday() {
  return new Date().toISOString().slice(0, 10);
}

/** Identifies a text regardless of surrounding or repeated whitespace. */
export function contentHash(text: string) {
  return createHash("sha256").update(text.replace(/\s+/g, " ").trim()).digest("hex");
}

/** Today's usage for the signed-in user, counted across any accounts that share limits with it (same device). */
export async function getDailyUsage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_daily_usage");
  if (error) throw error;
  const row = data?.[0];
  return {
    contents: { used: row?.contents_used ?? 0, limit: DAILY_CONTENT_LIMIT },
    scans: { used: row?.scans_used ?? 0, limit: DAILY_SCAN_LIMIT },
    shared: row?.shared ?? false,
  };
}

/** Uses one of today's content slots unless this exact text (or a result derived from it) was already used today. */
export async function claimContent(text: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_content", { p_hash: contentHash(text) });
  if (error) throw error;
  return data === true;
}

export async function isDerivedContent(userId: string, text: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_contents")
    .select("id")
    .eq("user_id", userId)
    .eq("day", utcToday())
    .eq("content_hash", contentHash(text))
    .not("parent_hash", "is", null)
    .maybeSingle();
  return !!data;
}

/** Lets a rewritten result be checked without using another slot. Written with the service role so users can't forge it. */
export async function registerDerivedContent(userId: string, parentText: string, derivedText: string) {
  const admin = createAdminClient();
  await admin
    .from("daily_contents")
    .upsert(
      { user_id: userId, day: utcToday(), content_hash: contentHash(derivedText), parent_hash: contentHash(parentText) },
      { onConflict: "user_id,day,content_hash", ignoreDuplicates: true },
    );
}

export async function consumeDailyScan() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consume_daily_scan");
  if (error) throw error;
  return data === true;
}

// Service-role versions for API key requests, which have no session. Same quota as the app.

export async function getDailyUsageFor(userId: string) {
  const { data, error } = await createAdminClient().rpc("get_daily_usage_for", { p_user: userId });
  if (error) throw error;
  const row = data?.[0];
  return {
    contents: { used: row?.contents_used ?? 0, limit: DAILY_CONTENT_LIMIT },
    scans: { used: row?.scans_used ?? 0, limit: DAILY_SCAN_LIMIT },
  };
}

export async function claimContentFor(userId: string, text: string) {
  const { data, error } = await createAdminClient().rpc("claim_content_for", { p_user: userId, p_hash: contentHash(text) });
  if (error) throw error;
  return data === true;
}

export async function consumeDailyScanFor(userId: string) {
  const { data, error } = await createAdminClient().rpc("consume_daily_scan_for", { p_user: userId });
  if (error) throw error;
  return data === true;
}
