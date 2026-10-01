import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import disposableDomains from "disposable-email-domains";
import { cookies, headers } from "next/headers";
import { EMAIL_PROVIDER_MESSAGE, isAllowedEmailDomain } from "@/lib/email-domains";
import { createAdminClient } from "@/lib/supabase/admin";

export const DEVICE_COOKIE = "lc_did";
const FINGERPRINT_COOKIE = "lc_fp";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FINGERPRINT_RE = /^[0-9a-f]{64}$/;

/**
 * Anti-bot cap only: an IP identifies a network (shared by everyone on the same Wi-Fi or carrier), not a device,
 * so it must stay loose. One account per device is enforced by the device ID.
 */
const MAX_ACCOUNTS_PER_IP = Math.max(1, Number(process.env.SIGNUP_MAX_ACCOUNTS_PER_IP) || 20);
const IP_WINDOW_DAYS = Math.max(1, Number(process.env.SIGNUP_IP_WINDOW_DAYS) || 1);

export const DEVICE_BLOCKED_MESSAGE =
  "An account has already been created on this device. Each person can have one Lucenta account, so please log in instead.";
export const IP_BLOCKED_MESSAGE = "Too many accounts have been created from your network today. Please try again tomorrow.";

export type DeviceContext = { deviceIds: string[]; fingerprint: string | null; ip: string | null };
export type GuardResult = { allowed: true } | { allowed: false; reason: "device" | "ip"; message: string };

let disposableSet: Set<string> | null = null;

function hash(value: string) {
  const secret = process.env.SIGNUP_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "lucenta";
  return createHmac("sha256", secret).update(value).digest("hex");
}

function isPrivateIp(ip: string) {
  return (
    ip === "::1" ||
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip.startsWith("fc") ||
    ip.startsWith("fd") ||
    ip.startsWith("fe80")
  );
}

async function clientIp(): Promise<string | null> {
  const h = await headers();
  const raw =
    h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? h.get("cf-connecting-ip") ?? "";
  const ip = raw.trim().replace(/^::ffff:/, "").toLowerCase();
  return ip && !isPrivateIp(ip) ? ip : null;
}

function setLongCookie(store: Awaited<ReturnType<typeof cookies>>, name: string, value: string) {
  store.set(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

/**
 * Collects this browser's device IDs (cookie + the copy kept in localStorage) and fingerprint, and keeps both in cookies
 * so they survive the Google sign-in redirect. Only callable where cookies can be written (server actions, route handlers).
 */
export async function getDeviceContext(
  clientDeviceId?: FormDataEntryValue | null,
  clientFingerprint?: FormDataEntryValue | null,
): Promise<DeviceContext> {
  const store = await cookies();
  const fromCookie = store.get(DEVICE_COOKIE)?.value;
  const fromClient = typeof clientDeviceId === "string" ? clientDeviceId : undefined;
  const deviceIds = [fromCookie, fromClient].filter((id): id is string => !!id && UUID_RE.test(id));
  const unique = [...new Set(deviceIds.map((id) => id.toLowerCase()))];
  if (unique.length === 0) unique.push(randomUUID());
  setLongCookie(store, DEVICE_COOKIE, unique[0]);

  const fpClient = typeof clientFingerprint === "string" && FINGERPRINT_RE.test(clientFingerprint) ? clientFingerprint : null;
  const fpCookie = store.get(FINGERPRINT_COOKIE)?.value;
  const fingerprint = fpClient ?? (fpCookie && FINGERPRINT_RE.test(fpCookie) ? fpCookie : null);
  if (fpClient) setLongCookie(store, FINGERPRINT_COOKIE, fpClient);

  return { deviceIds: unique, fingerprint, ip: await clientIp() };
}

/** Whether a new account may be created from this device/network. `ignoreUserId` skips rows belonging to that user. */
export async function checkSignupAllowed(ctx: DeviceContext, ignoreUserId?: string): Promise<GuardResult> {
  const admin = createAdminClient();

  let deviceQuery = admin
    .from("account_devices")
    .select("id", { count: "exact", head: true })
    .in("device_hash", ctx.deviceIds.map(hash));
  if (ignoreUserId) deviceQuery = deviceQuery.or(`user_id.is.null,user_id.neq.${ignoreUserId}`);
  const { count: deviceCount, error: deviceError } = await deviceQuery;
  if (deviceError) throw deviceError;
  if ((deviceCount ?? 0) > 0) return { allowed: false, reason: "device", message: DEVICE_BLOCKED_MESSAGE };

  if (ctx.ip) {
    const since = new Date(Date.now() - IP_WINDOW_DAYS * 86_400_000).toISOString();
    let ipQuery = admin
      .from("account_devices")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", hash(ctx.ip))
      .in("source", ["signup", "google"])
      .gte("created_at", since);
    if (ignoreUserId) ipQuery = ipQuery.or(`user_id.is.null,user_id.neq.${ignoreUserId}`);
    const { count: ipCount, error: ipError } = await ipQuery;
    if (ipError) throw ipError;
    if ((ipCount ?? 0) >= MAX_ACCOUNTS_PER_IP) return { allowed: false, reason: "ip", message: IP_BLOCKED_MESSAGE };
  }

  return { allowed: true };
}

/**
 * Accepts well-known email providers only, and rejects disposable inboxes and addresses that are
 * variations (dots, +tags) of an existing account's email.
 */
export async function checkEmailAllowed(
  email: string,
  excludeUserId?: string,
): Promise<{ allowed: true } | { allowed: false; message: string }> {
  if (!isAllowedEmailDomain(email)) return { allowed: false, message: EMAIL_PROVIDER_MESSAGE };
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  disposableSet ??= new Set(disposableDomains);
  if (disposableSet.has(domain)) {
    return { allowed: false, message: "Temporary or disposable email addresses can't be used. Please use your real email." };
  }

  const { data, error } = await createAdminClient().rpc("email_in_use", {
    p_email: email,
    ...(excludeUserId ? { p_exclude: excludeUserId } : {}),
  });
  if (error) throw error;
  if (data) return { allowed: false, message: "An account already exists for this email address. Please log in instead." };
  return { allowed: true };
}

/** The account whose daily limits a new account on this device should share, if its fingerprint matches one. */
export async function findQuotaOwner(ctx: DeviceContext, excludeUserId?: string): Promise<string | null> {
  if (!ctx.fingerprint) return null;
  const admin = createAdminClient();
  let query = admin
    .from("account_devices")
    .select("user_id")
    .eq("fingerprint_hash", hash(ctx.fingerprint))
    .not("user_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(1);
  if (excludeUserId) query = query.neq("user_id", excludeUserId);
  const { data } = await query;
  const matched = data?.[0]?.user_id;
  if (!matched) return null;

  const { data: link } = await admin.from("quota_links").select("owner_id").eq("user_id", matched).maybeSingle();
  return link?.owner_id ?? matched;
}

export async function linkQuota(userId: string, ownerId: string) {
  if (userId === ownerId) return;
  await createAdminClient()
    .from("quota_links")
    .upsert({ user_id: userId, owner_id: ownerId }, { onConflict: "user_id", ignoreDuplicates: true });
}

export async function recordDevice(ctx: DeviceContext, userId: string, source: "signup" | "google" | "login") {
  const admin = createAdminClient();
  const fingerprintHash = ctx.fingerprint ? hash(ctx.fingerprint) : null;
  let deviceHashes = ctx.deviceIds.map(hash);

  if (source === "login") {
    const { data } = await admin
      .from("account_devices")
      .select("device_hash, fingerprint_hash")
      .eq("user_id", userId)
      .in("device_hash", deviceHashes);
    const known = new Set((data ?? []).map((row) => `${row.device_hash}|${row.fingerprint_hash ?? ""}`));
    deviceHashes = deviceHashes.filter((h) => !known.has(`${h}|${fingerprintHash ?? ""}`));
    if (deviceHashes.length === 0) return;
  }

  const ipHash = ctx.ip ? hash(ctx.ip) : null;
  await admin.from("account_devices").insert(
    deviceHashes.map((device_hash) => ({
      user_id: userId,
      device_hash,
      fingerprint_hash: fingerprintHash,
      ip_hash: ipHash,
      source,
    })),
  );
}

/** True if this user has any recorded device, i.e. the account existed before this sign-in. */
export async function hasRecordedDevice(userId: string) {
  const admin = createAdminClient();
  const { count } = await admin
    .from("account_devices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return (count ?? 0) > 0;
}
