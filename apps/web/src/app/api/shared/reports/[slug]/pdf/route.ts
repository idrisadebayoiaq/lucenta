import { renderReportPdf, reportPdfFileName } from "@/lib/reports/report-pdf";
import { jsonError, pdfResponse } from "@/lib/reports/respond";
import { getSharedReport } from "@/lib/reports/shared";
import { shareUrl } from "@/lib/site";

export const maxDuration = 30;

export async function GET(_: Request, { params }: RouteContext<"/api/shared/reports/[slug]/pdf">) {
  const { slug } = await params;
  const shared = await getSharedReport(slug);
  if (!shared) return jsonError("NOT_FOUND", "This report isn't shared any more.", 404);
  const pdf = await renderReportPdf(shared.report, { whiteLabel: false }, shared.createdAt, shareUrl(`/r/${slug}`));
  return pdfResponse(pdf, reportPdfFileName(shared.report));
}
