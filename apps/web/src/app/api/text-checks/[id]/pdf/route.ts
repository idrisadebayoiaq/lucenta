import { NextResponse, type NextRequest } from "next/server";
import type { DetectionResult } from "@/lib/detector/types";
import { detectionPdfFileName, renderDetectionPdf } from "@/lib/reports/detection-pdf";
import { brandFor, jsonError, pdfResponse } from "@/lib/reports/respond";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export const maxDuration = 30;

export async function GET(request: NextRequest, { params }: RouteContext<"/api/text-checks/[id]/pdf">) {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Please log in.", 401);

  const { id } = await params;
  const supabase = await createClient();
  const { data: check } = await supabase
    .from("text_checks")
    .select("kind, title, input_text, result, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  const result = check?.kind === "detect" ? (check.result as unknown as DetectionResult | null) : null;
  if (!check || !result || !check.input_text) return jsonError("NOT_FOUND", "Report not found.", 404);

  const brand = await brandFor(request, user.id);
  if (brand instanceof NextResponse) return brand;

  const title = check.title || check.input_text.slice(0, 80);
  const pdf = await renderDetectionPdf({ title, text: check.input_text, result, createdAt: check.created_at }, brand);
  return pdfResponse(pdf, detectionPdfFileName(title));
}
