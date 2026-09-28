import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PdfBrand } from "./pdf-kit";

export function pdfResponse(pdf: Buffer, fileName: string) {
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${fileName}"`,
      "cache-control": "private, no-store",
    },
  });
}

export function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** `?brand=white` uses the owner's company (or full name) instead of Lucenta. Returns an error response if neither is set. */
export async function brandFor(request: NextRequest, userId: string): Promise<PdfBrand | NextResponse> {
  if (request.nextUrl.searchParams.get("brand") !== "white") return { whiteLabel: false };
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("company,full_name").eq("id", userId).maybeSingle();
  const name = profile?.company?.trim() || profile?.full_name?.trim();
  if (!name) return jsonError("NO_BRAND", "Add your company name in your profile to download a white-label PDF.", 400);
  return { whiteLabel: true, name };
}
