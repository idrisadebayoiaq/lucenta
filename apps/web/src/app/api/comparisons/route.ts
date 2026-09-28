import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { MAX_COMPETITORS } from "@/lib/analyzer/compare";
import { runScan } from "@/lib/analyzer/run-scan";
import { assertSafeUrl, normalizeUrl, UnsafeUrlError } from "@/lib/analyzer/safe-fetch";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getDailyUsage, utcToday } from "@/lib/usage";

export const maxDuration = 120;

const urlField = z.string().trim().min(3, "Enter a website URL").max(2048);

const bodySchema = z.object({
  url: urlField,
  competitors: z
    .array(urlField)
    .min(1, "Add at least one competitor")
    .max(MAX_COMPETITORS, `You can compare up to ${MAX_COMPETITORS} competitors`),
  device: z.enum(["mobile", "desktop"]).default("mobile"),
  /** Re-scan every site instead of reusing today's scans. */
  fresh: z.boolean().default(false),
});

function error(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return error("UNAUTHORIZED", "Please log in to compare websites.", 401);

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return error("INVALID_INPUT", parsed.error.issues[0].message, 400);
  const { device, fresh } = parsed.data;

  const urls: string[] = [];
  for (const input of [parsed.data.url, ...parsed.data.competitors]) {
    try {
      const url = normalizeUrl(input);
      await assertSafeUrl(url);
      urls.push(url.toString());
    } catch (e) {
      const message = e instanceof UnsafeUrlError ? e.message : `"${input}" doesn't look like a valid website address.`;
      return error("INVALID_URL", message, 400);
    }
  }
  if (new Set(urls).size !== urls.length) return error("DUPLICATE_URL", "Each website can only be added once.", 400);

  const supabase = await createClient();
  const reusable = new Map<string, string>();
  if (!fresh) {
    const { data: today } = await supabase
      .from("scans")
      .select("id,url")
      .eq("user_id", user.id)
      .eq("device", device)
      .eq("status", "completed")
      .in("url", urls)
      .gte("created_at", `${utcToday()}T00:00:00Z`)
      .order("created_at", { ascending: false });
    for (const scan of today ?? []) if (!reusable.has(scan.url)) reusable.set(scan.url, scan.id);
  }

  const toScan = urls.filter((u) => !reusable.has(u));
  const { scans } = await getDailyUsage();
  const left = Math.max(0, scans.limit - scans.used);
  if (toScan.length > left) {
    const needs = `This comparison needs ${toScan.length} website audit${toScan.length === 1 ? "" : "s"}`;
    const has = left === 0 ? "you've used all of today's audits" : `you have ${left} left today`;
    return error("DAILY_LIMIT", `${needs}, but ${has}. Remove a competitor or try again after midnight UTC.`, 429);
  }

  const outcomes = new Map(
    await Promise.all(toScan.map(async (u) => [u, await runScan(user.id, u, device)] as const)),
  );
  const sites = urls.map((url) => {
    const outcome = outcomes.get(url);
    const scanId = outcome ? outcome.scanId : reusable.get(url)!;
    const ok = !outcome || outcome.status === "completed";
    return { url, scanId, ok, message: outcome && outcome.status !== "completed" ? outcome.message : null };
  });

  const [yours, ...competitors] = sites;
  if (!yours.ok) {
    return error("SCAN_FAILED", `We couldn't analyze your site: ${yours.message}`, 422);
  }
  if (!competitors.some((c) => c.ok)) {
    return error("SCAN_FAILED", `We couldn't analyze any of the competitors. ${competitors[0].message ?? ""}`.trim(), 422);
  }

  const { data: comparison, error: insertError } = await supabase
    .from("comparisons")
    .insert({ user_id: user.id, site_url: yours.url, device })
    .select("id")
    .single();
  if (insertError || !comparison) return error("DB_ERROR", insertError?.message ?? "Could not save the comparison.", 500);

  const { error: sitesError } = await supabase
    .from("comparison_sites")
    .insert(sites.map((s, position) => ({ comparison_id: comparison.id, position, url: s.url, scan_id: s.scanId })));
  if (sitesError) {
    await supabase.from("comparisons").delete().eq("id", comparison.id);
    return error("DB_ERROR", sitesError.message, 500);
  }

  return NextResponse.json({
    comparisonId: comparison.id,
    failed: competitors.filter((c) => !c.ok).map((c) => ({ url: c.url, message: c.message })),
  });
}
