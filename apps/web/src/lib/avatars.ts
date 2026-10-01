import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// Profile photos live in the private "avatars" bucket. avatar_url keeps the object's public-style URL as its
// identifier; to display a photo, sign it with the viewer's client so storage policies decide who can see it.
const PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/`;

export const avatarPath = (url: string | null | undefined) => (url?.startsWith(PREFIX) ? url.slice(PREFIX.length) : null);

export async function signAvatars(supabase: SupabaseClient<Database>, urls: (string | null)[]): Promise<(string | null)[]> {
  const paths = [...new Set(urls.map(avatarPath).filter((p): p is string => !!p))];
  if (!paths.length) return urls;
  const { data } = await supabase.storage.from("avatars").createSignedUrls(paths, 60 * 60);
  const signed = new Map((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl]));
  return urls.map((url) => {
    const path = avatarPath(url);
    return path ? (signed.get(path) ?? null) : url;
  });
}

export async function signAvatar(supabase: SupabaseClient<Database>, url: string | null) {
  return (await signAvatars(supabase, [url]))[0];
}
