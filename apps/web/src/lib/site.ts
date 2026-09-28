/** Public address of the deployed app. Used for share links, PDFs and link previews. */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://lucenta-beige.vercel.app").replace(/\/$/, "");

export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

/** Share links always point at the live site, except in local development where the local server is used. */
export function shareUrl(path: string) {
  const base = process.env.NODE_ENV === "production" || typeof window === "undefined" ? SITE_URL : window.location.origin;
  return `${base}${path}`;
}
