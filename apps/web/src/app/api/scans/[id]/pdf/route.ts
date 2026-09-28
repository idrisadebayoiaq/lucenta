import { NextResponse, type NextRequest } from "next/server";
import type { Report } from "@/lib/analyzer/types";
import { renderReportPdf, reportPdfFileName } from "@/lib/reports/report-pdf";
import { brandFor, jsonError, pdfResponse } from "@/lib/reports/respond";
import { shareUrl } from "@/lib/site";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export const maxDuration = 30;

export async function GET(request: NextRequest, { params }: RouteContext<"/api/scans/[id]/pdf">) {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Please log in.", 401);

  const { id } = await params;
  const supabase = await createClient();
  const { data: scan } = await supabase
    .from("scans")
    .select("created_at, is_public, share_slug, scan_results(report)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  const result = Array.isArray(scan?.scan_results) ? scan.scan_results[0] : scan?.scan_results;
  if (!scan || !result?.report) return jsonError("NOT_FOUND", "Report not found.", 404);
  const report = result.report as unknown as Report;

  const brand = await brandFor(request, user.id);
  if (brand instanceof NextResponse) return brand;

  const onlineUrl = scan.is_public && scan.share_slug ? shareUrl(`/r/${scan.share_slug}`) : undefined;
  return pdfResponse(await renderReportPdf(report, brand, scan.created_at, onlineUrl), reportPdfFileName(report));
}
