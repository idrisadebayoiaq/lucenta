import "server-only";
import { after, NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashApiKey, looksLikeApiKey } from "./keys";

/** Requests per minute per account, across all of its keys. */
export const RATE_LIMIT_PER_MINUTE = 60;

export type ApiContext = { userId: string; keyId: string };

export function apiError(code: string, message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: { code, message } }, { status, headers });
}

async function authenticate(request: NextRequest): Promise<ApiContext | NextResponse> {
  const header = request.headers.get("authorization") ?? "";
  const key = header.replace(/^Bearer\b/i, "").trim();
  if (!key) return apiError("UNAUTHORIZED", "Add your API key as a header: Authorization: Bearer lc_live_…", 401);
  if (!looksLikeApiKey(key)) return apiError("UNAUTHORIZED", "That API key isn't valid.", 401);

  const { data } = await createAdminClient()
    .from("api_keys")
    .select("id,user_id")
    .eq("key_hash", hashApiKey(key))
    .is("revoked_at", null)
    .maybeSingle();
  if (!data) return apiError("UNAUTHORIZED", "That API key isn't valid or has been revoked.", 401);
  return { userId: data.user_id, keyId: data.id };
}

async function overRateLimit(userId: string) {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await createAdminClient()
    .from("api_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  return (count ?? 0) >= RATE_LIMIT_PER_MINUTE;
}

/**
 * Wraps a v1 route: checks the API key and rate limit, then logs the request for the usage dashboard
 * after the response is sent.
 */
export function withApiKey<P>(handler: (request: NextRequest, ctx: ApiContext, route: P) => Promise<NextResponse>) {
  return async (request: NextRequest, route: P) => {
    const started = Date.now();
    const auth = await authenticate(request);
    if (auth instanceof NextResponse) return auth;

    let response: NextResponse;
    if (await overRateLimit(auth.userId)) {
      response = apiError("RATE_LIMITED", `Too many requests. The limit is ${RATE_LIMIT_PER_MINUTE} per minute.`, 429, { "retry-after": "60" });
    } else {
      try {
        response = await handler(request, auth, route);
      } catch (e) {
        console.error("API error", e);
        response = apiError("INTERNAL_ERROR", "Something went wrong on our side. Please try again.", 500);
      }
    }

    const status = response.status;
    after(async () => {
      const admin = createAdminClient();
      await Promise.all([
        admin.from("api_requests").insert({
          user_id: auth.userId,
          key_id: auth.keyId,
          method: request.method,
          path: request.nextUrl.pathname,
          status,
          duration_ms: Date.now() - started,
        }),
        admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", auth.keyId),
      ]);
    });
    return response;
  };
}
