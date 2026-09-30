import "server-only";
import { createHmac } from "node:crypto";

const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|whatsapp|telegram|curl|wget|python|axios|node-fetch|go-http/i;
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export function isBot(ua: string) {
  return !ua || BOT_RE.test(ua);
}

export function deviceType(ua: string): "mobile" | "tablet" | "desktop" {
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return "mobile";
  return "desktop";
}

export function browserName(ua: string) {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/SamsungBrowser/.test(ua)) return "Samsung Internet";
  if (/Firefox|FxiOS/.test(ua)) return "Firefox";
  if (/Chrome|CriOS/.test(ua)) return "Chrome";
  if (/Safari/.test(ua)) return "Safari";
  return "Other";
}

/** Groups pages like /dashboard/history/<uuid> under one path. Returns null for paths that shouldn't be counted. */
export function normalizePath(raw: string) {
  const path = raw.split(/[?#]/)[0].replace(UUID_RE, ":id").slice(0, 300);
  if (!path.startsWith("/") || path.startsWith("/api") || path.startsWith("/dashboard/admin")) return null;
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

export function referrerHost(raw: string | undefined, ownHost: string | null) {
  if (!raw) return null;
  try {
    const host = new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
    if (!host || host === ownHost?.replace(/^www\./, "").toLowerCase()) return null;
    return host.slice(0, 200);
  } catch {
    return null;
  }
}

/** Anonymous visitor ID: the same person gets the same ID for one UTC day only, and it can't be reversed to an IP. */
export function visitorId(ip: string, ua: string, day: string) {
  const secret = process.env.SIGNUP_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "lucenta";
  return createHmac("sha256", secret).update(`analytics:${day}:${ip}:${ua}`).digest("hex").slice(0, 32);
}
