import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { runScan } from "@/lib/analyzer/run-scan";
import { normalizeUrl, UnsafeUrlError, assertSafeUrl } from "@/lib/analyzer/safe-fetch";
import { getCurrentUser } from "@/lib/supabase/server";
import { getDailyUsage } from "@/lib/usage";

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

  const outcome = await runScan(user.id, url.toString(), parsed.data.device);
  if (outcome.status === "error") return error("DB_ERROR", outcome.message, 500);
  if (outcome.status === "failed") {
    return NextResponse.json({ scanId: outcome.scanId, status: "failed", error: { code: "SCAN_FAILED", message: outcome.message } }, { status: 422 });
  }
  return NextResponse.json({ scanId: outcome.scanId, status: "completed" });
}
