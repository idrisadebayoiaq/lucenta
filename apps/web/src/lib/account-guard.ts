import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export const DEVICE_COOKIE = "lc_did";
const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** How many accounts one IP address may create within the window. Shared networks (offices, mobile carriers) share IPs. */
const MAX_ACCOUNTS_PER_IP = Math.max(1, Number(process.env.SIGNUP_MAX_ACCOUNTS_PER_IP) || 1);
const IP_WINDOW_DAYS = Math.max(1, Number(process.env.SIGNUP_IP_WINDOW_DAYS) || 30);

export const DEVICE_BLOCKED_MESSAGE =
  "An account has already been created on this device. Each person can have one Lucenta account — please log in instead.";
export const IP_BLOCKED_MESSAGE =
  "An account was recently created from your network. Each person can have one Lucenta account — please log in instead.";

export type DeviceContext = { deviceIds: string[]; ip: string | null };
export type GuardResult = { allowed: true } | { allowed: false; reason: "device" | "ip"; message: string };

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

/**
 * Collects this browser's device IDs (cookie + the copy kept in localStorage) and makes sure the cookie is set.
 * Only callable where cookies can be written (server actions, route handlers).
 */
export async function getDeviceContext(clientDeviceId?: FormDataEntryValue | null): Promise<DeviceContext> {
  const store = await cookies();
  const fromCookie = store.get(DEVICE_COOKIE)?.value;
  const fromClient = typeof clientDeviceId === "string" ? clientDeviceId : undefined;
  const deviceIds = [fromCookie, fromClient].filter((id): id is string => !!id && UUID_RE.test(id));
  const unique = [...new Set(deviceIds.map((id) => id.toLowerCase()))];
  if (unique.length === 0) unique.push(randomUUID());

  store.set(DEVICE_COOKIE, unique[0], {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: DEVICE_COOKIE_MAX_AGE,
    path: "/",
  });

  return { deviceIds: unique, ip: await clientIp() };
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

export async function recordDevice(ctx: DeviceContext, userId: string, source: "signup" | "google" | "login") {
  const admin = createAdminClient();
  let deviceHashes = ctx.deviceIds.map(hash);

  if (source === "login") {
    const { data } = await admin
      .from("account_devices")
      .select("device_hash")
      .eq("user_id", userId)
      .in("device_hash", deviceHashes);
    const known = new Set((data ?? []).map((row) => row.device_hash));
    deviceHashes = deviceHashes.filter((h) => !known.has(h));
    if (deviceHashes.length === 0) return;
  }

  const ipHash = ctx.ip ? hash(ctx.ip) : null;
  await admin
    .from("account_devices")
    .insert(deviceHashes.map((device_hash) => ({ user_id: userId, device_hash, ip_hash: ipHash, source })));
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
