import { NextResponse, type NextRequest } from "next/server";
import { loadOwnComparison } from "@/lib/comparisons/load";
import { comparisonPdfFileName, renderComparisonPdf } from "@/lib/reports/comparison-pdf";
import { brandFor, jsonError, pdfResponse } from "@/lib/reports/respond";
import { shareUrl } from "@/lib/site";
import { getCurrentUser } from "@/lib/supabase/server";

export const maxDuration = 30;

export async function GET(request: NextRequest, { params }: RouteContext<"/api/comparisons/[id]/pdf">) {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Please log in.", 401);

  const { id } = await params;
  const loaded = await loadOwnComparison(id);
  if (!loaded) return jsonError("NOT_FOUND", "Comparison not found.", 404);

  const brand = await brandFor(request, user.id);
  if (brand instanceof NextResponse) return brand;

  const { comparison, data } = loaded;
  const onlineUrl = comparison.is_public && comparison.share_slug ? shareUrl(`/c/${comparison.share_slug}`) : undefined;
  return pdfResponse(await renderComparisonPdf(data, brand, onlineUrl), comparisonPdfFileName(data));
}
