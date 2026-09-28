import { getSharedComparison } from "@/lib/comparisons/load";
import { comparisonPdfFileName, renderComparisonPdf } from "@/lib/reports/comparison-pdf";
import { jsonError, pdfResponse } from "@/lib/reports/respond";
import { shareUrl } from "@/lib/site";

export const maxDuration = 30;

export async function GET(_: Request, { params }: RouteContext<"/api/shared/comparisons/[slug]/pdf">) {
  const { slug } = await params;
  const data = await getSharedComparison(slug);
  if (!data) return jsonError("NOT_FOUND", "This comparison isn't shared any more.", 404);
  return pdfResponse(await renderComparisonPdf(data, { whiteLabel: false }, shareUrl(`/c/${slug}`)), comparisonPdfFileName(data));
}
