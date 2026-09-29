import "server-only";
import { createHmac } from "node:crypto";
import { assertSafeUrl, UnsafeUrlError } from "@/lib/analyzer/safe-fetch";
import { createAdminClient } from "@/lib/supabase/admin";

export type WebhookEvent = "audit.completed" | "audit.failed" | "test";

/** `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>">`, the same scheme Stripe uses. */
export function signPayload(secret: string, body: string, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

export async function assertWebhookUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new UnsafeUrlError("Webhook URLs must use https.");
  await assertSafeUrl(url);
  return url;
}

/**
 * Sends one event to the account's webhook, if it has an enabled one. Never follows redirects and never throws;
 * the outcome is saved on the webhook row so it shows in the dashboard.
 */
export async function deliverWebhook(userId: string, event: WebhookEvent, data: unknown, { force = false } = {}) {
  const admin = createAdminClient();
  const { data: hook } = await admin.from("api_webhooks").select("url,secret,enabled").eq("user_id", userId).maybeSingle();
  if (!hook || (!hook.enabled && !force)) return null;

  const body = JSON.stringify({ event, created_at: new Date().toISOString(), data });
  let status: number | null = null;
  let error: string | null = null;
  try {
    const url = await assertWebhookUrl(hook.url);
    const res = await fetch(url, {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "content-type": "application/json",
        "user-agent": "Lucenta-Webhooks/1.0",
        "lucenta-event": event,
        "lucenta-signature": signPayload(hook.secret, body),
      },
      body,
    });
    status = res.status;
    if (!res.ok) error = `Your endpoint responded with ${res.status}.`;
  } catch (e) {
    error =
      e instanceof UnsafeUrlError ? e.message
      : e instanceof Error && e.name === "TimeoutError" ? "Your endpoint took longer than 10 seconds to respond."
      : "Could not reach your endpoint.";
  }

  await admin
    .from("api_webhooks")
    .update({ last_status: status, last_error: error, last_delivered_at: new Date().toISOString() })
    .eq("user_id", userId);
  return { status, error };
}
