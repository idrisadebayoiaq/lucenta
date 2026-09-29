import { NextResponse } from "next/server";
import type { Report } from "@/lib/analyzer/types";
import { apiError, withApiKey } from "@/lib/api/handler";
import { auditReport, auditSummary, SCAN_COLUMNS } from "@/lib/api/serialize";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET = withApiKey<RouteContext<"/api/v1/audits/[id]">>(async (_request, { userId }, { params }) => {
  const { id } = await params;
  if (!UUID_RE.test(id)) return apiError("NOT_FOUND", "Audit not found.", 404);

  const { data: scan } = await createAdminClient()
    .from("scans")
    .select(`${SCAN_COLUMNS}, scan_results(report)`)
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!scan) return apiError("NOT_FOUND", "Audit not found.", 404);

  const result = Array.isArray(scan.scan_results) ? scan.scan_results[0] : scan.scan_results;
  const report = result?.report as unknown as Report | undefined;
  return NextResponse.json({ ...auditSummary(scan), report: report ? auditReport(report) : null });
});
