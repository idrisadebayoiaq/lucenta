import "server-only";
import { analyzeWebsite } from "@/lib/analyzer/analyze";
import { UnsafeUrlError } from "@/lib/analyzer/safe-fetch";
import type { Report } from "@/lib/analyzer/types";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { consumeDailyScan } from "@/lib/usage";

export type ScanOutcome =
  | { scanId: string; status: "completed"; report: Report }
  | { scanId: string; status: "failed"; message: string }
  | { scanId: null; status: "error"; message: string };

function failureMessage(e: unknown) {
  if (e instanceof UnsafeUrlError) return e.message;
  if (e instanceof Error && e.name === "TimeoutError") return "The website took too long to respond.";
  if (e instanceof Error) return e.message;
  return "The scan failed.";
}

/** Creates a scan row, analyzes the site and saves the report. Uses one daily scan only if the analysis succeeds. */
export async function runScan(userId: string, url: string, device: "mobile" | "desktop"): Promise<ScanOutcome> {
  const supabase = await createClient();
  const { data: scan, error: insertError } = await supabase
    .from("scans")
    .insert({ user_id: userId, url, device, status: "running", stage: "Analyzing", progress: 10 })
    .select("id")
    .single();
  if (insertError || !scan) return { scanId: null, status: "error", message: insertError?.message ?? "Could not create scan." };

  try {
    const report = await analyzeWebsite(url, device);
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
    return { scanId: scan.id, status: "completed", report };
  } catch (e) {
    const message = failureMessage(e);
    await supabase.from("scans").update({ status: "failed", error: message, stage: "Failed" }).eq("id", scan.id);
    return { scanId: scan.id, status: "failed", message };
  }
}
