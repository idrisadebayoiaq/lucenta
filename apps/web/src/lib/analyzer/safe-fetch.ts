import { lookup } from "node:dns/promises";
import net from "node:net";

export class UnsafeUrlError extends Error {}

const USER_AGENT = "Mozilla/5.0 (compatible; LucentaBot/1.0; +https://lucenta.app/bot)";

function isPrivateIPv4(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIp(ip: string) {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  const lower = ip.toLowerCase();
  if (lower.startsWith("::ffff:")) return isPrivateIPv4(lower.slice(7));
  return lower === "::" || lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
}

export function normalizeUrl(input: string) {
  let value = input.trim();
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  const url = new URL(value);
  url.hash = "";
  return url;
}

export async function assertSafeUrl(url: URL) {
  if (!["http:", "https:"].includes(url.protocol)) throw new UnsafeUrlError("Only http and https URLs are allowed.");
  if (url.port && !["80", "443"].includes(url.port)) throw new UnsafeUrlError("Only standard ports (80/443) are allowed.");
  if (url.username || url.password) throw new UnsafeUrlError("URLs with credentials are not allowed.");

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new UnsafeUrlError("Private hosts cannot be scanned.");
  }

  const addresses = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addresses.length === 0) throw new UnsafeUrlError("That domain could not be found.");
  if (addresses.some((a) => isPrivateIp(a.address))) throw new UnsafeUrlError("Private or internal addresses cannot be scanned.");
}

export type SafeResponse = {
  response: Response;
  finalUrl: URL;
  redirects: string[];
  ttfbMs: number;
};

/** Fetch that validates every hop against private address ranges. */
export async function safeFetch(
  input: URL,
  init: { method?: string; timeoutMs?: number; maxRedirects?: number } = {},
): Promise<SafeResponse> {
  const { method = "GET", timeoutMs = 15000, maxRedirects = 5 } = init;
  let current = input;
  const redirects: string[] = [];

  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertSafeUrl(current);
    const started = performance.now();
    const response = await fetch(current, {
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml,*/*;q=0.8", "accept-encoding": "gzip, deflate, br" },
    });
    const ttfbMs = performance.now() - started;

    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      redirects.push(current.toString());
      current = new URL(location, current);
      continue;
    }
    return { response, finalUrl: current, redirects, ttfbMs };
  }
  throw new Error("Too many redirects.");
}

export async function readTextLimited(response: Response, maxBytes = 5 * 1024 * 1024) {
  const reader = response.body?.getReader();
  if (!reader) return { text: "", bytes: 0 };
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return { text: new TextDecoder().decode(Buffer.concat(chunks)), bytes };
}
