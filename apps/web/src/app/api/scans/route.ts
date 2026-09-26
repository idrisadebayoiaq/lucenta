import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { analyzeWebsite } from "@/lib/analyzer/analyze";
import { normalizeUrl, UnsafeUrlError, assertSafeUrl } from "@/lib/analyzer/safe-fetch";
import type { Json } from "@/lib/supabase/database.types";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { consumeDailyScan, getDailyUsage } from "@/lib/usage";

export const maxDuration = 90;

const bodySchema = z.object({
  url: z.string().trim().min(3, "Enter a website URL").max(2048),
  device: z.enum(["mobile", "desktop"]).default("mobile"),
});

function error(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return error("UNAUTHORIZED", "Please log in to analyze websites.", 401);

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return error("INVALID_URL", parsed.error.issues[0].message, 400);

  let url: URL;
  try {
    url = normalizeUrl(parsed.data.url);
    await assertSafeUrl(url);
  } catch (e) {
    const message = e instanceof UnsafeUrlError ? e.message : "That doesn't look like a valid website address.";
    return error("INVALID_URL", message, 400);
  }

  const { scans } = await getDailyUsage();
  if (scans.used >= scans.limit) {
    return error("DAILY_LIMIT", `You've run all ${scans.limit} website audits for today. Your limit resets at midnight UTC.`, 429);
  }

  const supabase = await createClient();
  const { data: scan, error: insertError } = await supabase
    .from("scans")
    .insert({ user_id: user.id, url: url.toString(), device: parsed.data.device, status: "running", stage: "Analyzing", progress: 10 })
    .select("id")
    .single();
  if (insertError || !scan) return error("DB_ERROR", insertError?.message ?? "Could not create scan.", 500);

  try {
    const report = await analyzeWebsite(url.toString(), parsed.data.device);
    await supabase.from("scan_results").insert({ scan_id: scan.id, report: report as unknown as Json });
    await supabase
      .from("scans")
      .update({
        status: "completed",
        stage: "Done",
        progress: 100,
        overall_score: report.overall.score,
        grade: report.overall.grade,
        completed_at: new Date().toISOString(),
      })
      .eq("id", scan.id);
    await consumeDailyScan().catch(() => false);
    return NextResponse.json({ scanId: scan.id, status: "completed" });
  } catch (e) {
    const message =
      e instanceof UnsafeUrlError
        ? e.message
        : e instanceof Error && e.name === "TimeoutError"
          ? "The website took too long to respond."
          : e instanceof Error
            ? e.message
            : "The scan failed.";
    await supabase.from("scans").update({ status: "failed", error: message, stage: "Failed" }).eq("id", scan.id);
    return NextResponse.json({ scanId: scan.id, status: "failed", error: { code: "SCAN_FAILED", message } }, { status: 422 });
  }
}
