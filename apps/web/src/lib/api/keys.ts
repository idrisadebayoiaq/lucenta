import "server-only";
import { createHash, randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
export const KEY_PREFIX = "lc_live_";
export const MAX_ACTIVE_KEYS = 5;

function randomString(length: number) {
  return Array.from(randomBytes(length), (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

/** A new key (~190 bits of randomness). Only the hash and a short display prefix are stored. */
export function generateApiKey() {
  const key = `${KEY_PREFIX}${randomString(32)}`;
  return { key, prefix: key.slice(0, KEY_PREFIX.length + 4), hash: hashApiKey(key) };
}

export function generateWebhookSecret() {
  return `whsec_${randomString(32)}`;
}

export function looksLikeApiKey(value: string) {
  return new RegExp(`^${KEY_PREFIX}[A-Za-z0-9]{32}$`).test(value);
}
