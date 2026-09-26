import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/** Cookie-less anon client for public data, so pages using it can be statically rendered and cached. */
export function createPublicClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
