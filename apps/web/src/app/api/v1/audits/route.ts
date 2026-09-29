import { after, NextResponse } from "next/server";
import { z } from "zod";
import { runScan } from "@/lib/analyzer/run-scan";
import { assertSafeUrl, normalizeUrl, UnsafeUrlError } from "@/lib/analyzer/safe-fetch";
import { apiError, withApiKey } from "@/lib/api/handler";
import { auditReport, auditSummary, SCAN_COLUMNS } from "@/lib/api/serialize";
import { deliverWebhook } from "@/lib/api/webhooks";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDailyUsageFor } from "@/lib/usage";

export const maxDuration = 100;

const bodySchema = z.object({
  url: z.string().trim().min(3, "url is required.").max(2048),
  device: z.enum(["mobile", "desktop"]).default("mobile"),
});

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  before: z.iso.datetime({ offset: true }).optional(),
});

/** Runs an audit and waits for it to finish (usually 20 to 60 seconds). */
export const POST = withApiKey(async (request, { userId }) => {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("INVALID_INPUT", parsed.error.issues[0].message, 400);

  let url: URL;
  try {
    url = normalizeUrl(parsed.data.url);
    await assertSafeUrl(url);
  } catch (e) {
    return apiError("INVALID_URL", e instanceof UnsafeUrlError ? e.message : "That doesn't look like a valid website address.", 400);
  }

  const { scans } = await getDailyUsageFor(userId);
  if (scans.used >= scans.limit) {
    return apiError("DAILY_LIMIT", `You've used all ${scans.limit} website audits for today. Your limit resets at midnight UTC.`, 429);
  }

  const outcome = await runScan(userId, url.toString(), parsed.data.device, true);
  if (outcome.status === "error") return apiError("INTERNAL_ERROR", "Could not start the audit. Please try again.", 500);

  const { data: scan } = await createAdminClient().from("scans").select(SCAN_COLUMNS).eq("id", outcome.scanId).single();
  if (!scan) return apiError("INTERNAL_ERROR", "Could not load the audit. Please try again.", 500);

  const audit =
    outcome.status === "completed" ? { ...auditSummary(scan), report: auditReport(outcome.report) } : auditSummary(scan);
  after(() => deliverWebhook(userId, outcome.status === "completed" ? "audit.completed" : "audit.failed", auditSummary(scan)));

  if (outcome.status === "failed") {
    return NextResponse.json({ ...audit, error: { code: "AUDIT_FAILED", message: outcome.message } }, { status: 422 });
  }
  return NextResponse.json(audit, { status: 201 });
});

/** Your audits, newest first. Page with `before=<created_at of the last item>`. */
export const GET = withApiKey(async (request, { userId }) => {
  const parsed = listSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return apiError("INVALID_INPUT", parsed.error.issues[0].message, 400);

  let query = createAdminClient()
    .from("scans")
    .select(SCAN_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(parsed.data.limit + 1);
  if (parsed.data.before) query = query.lt("created_at", parsed.data.before);
  const { data, error } = await query;
  if (error) return apiError("INTERNAL_ERROR", "Could not load your audits.", 500);

  const rows = data ?? [];
  const page = rows.slice(0, parsed.data.limit);
  return NextResponse.json({
    data: page.map(auditSummary),
    has_more: rows.length > parsed.data.limit,
    next_before: rows.length > parsed.data.limit ? page[page.length - 1].created_at : null,
  });
});
