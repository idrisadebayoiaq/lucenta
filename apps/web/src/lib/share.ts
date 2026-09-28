import "server-only";
import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** 16 random base62 characters (~95 bits), so share links can't be guessed. */
export function newShareSlug() {
  return Array.from(randomBytes(16), (b) => ALPHABET[b % ALPHABET.length]).join("");
}
