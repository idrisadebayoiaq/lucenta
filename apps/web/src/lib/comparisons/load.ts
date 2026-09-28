import "server-only";
import { cache } from "react";
import type { Report } from "@/lib/analyzer/types";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import type { ComparisonData, ComparisonSiteState } from "./data";

export const SLUG_PATTERN = /^[A-Za-z0-9]{16}$/;

/** A comparison owned by the signed-in user (RLS hides everyone else's). */
export async function loadOwnComparison(id: string) {
  const supabase = await createClient();
  const { data: comparison } = await supabase.from("comparisons").select("*").eq("id", id).maybeSingle();
  if (!comparison) return null;

  const [{ data: members }, { data: previous }] = await Promise.all([
    supabase.from("comparison_sites").select("position,url,scan_id").eq("comparison_id", id).order("position"),
    supabase
      .from("comparisons")
      .select("id,created_at")
      .eq("site_url", comparison.site_url)
      .eq("device", comparison.device)
      .lt("created_at", comparison.created_at)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const scanIds = (members ?? []).flatMap((m) => (m.scan_id ? [m.scan_id] : []));
  const { data: scans } = scanIds.length
    ? await supabase.from("scans").select("id,status,error,scan_results(report)").in("id", scanIds)
    : { data: [] };
  const scanById = new Map((scans ?? []).map((s) => [s.id, s]));

  const sites: ComparisonSiteState[] = (members ?? []).map((m) => {
    const scan = m.scan_id ? scanById.get(m.scan_id) : undefined;
    const result = Array.isArray(scan?.scan_results) ? scan.scan_results[0] : scan?.scan_results;
    const report = scan?.status === "completed" ? ((result?.report ?? null) as Report | null) : null;
    const error = report ? null : scan ? (scan.error ?? "This scan didn't finish.") : "This scan was deleted.";
    return { url: m.url, scanId: scan ? m.scan_id : null, report, error };
  });

  let prev: ComparisonData["previous"] = null;
  if (previous) {
    const { data: prevMembers } = await supabase.from("comparison_sites").select("url,scan_id").eq("comparison_id", previous.id);
    const prevIds = (prevMembers ?? []).flatMap((m) => (m.scan_id ? [m.scan_id] : []));
    const { data: prevScans } = prevIds.length
      ? await supabase.from("scans").select("id,overall_score").in("id", prevIds)
      : { data: [] };
    const scoreById = new Map((prevScans ?? []).map((s) => [s.id, s.overall_score]));
    const scores: Record<string, number> = {};
    for (const m of prevMembers ?? []) {
      const score = m.scan_id ? scoreById.get(m.scan_id) : null;
      if (score != null) scores[m.url] = score;
    }
    prev = { createdAt: previous.created_at, scores };
  }

  const data: ComparisonData = { siteUrl: comparison.site_url, device: comparison.device, createdAt: comparison.created_at, sites, previous: prev };
  return { comparison, data };
}

type SharedRow = {
  site_url: string;
  device: string;
  created_at: string;
  sites: { position: number; url: string; status: string | null; error: string | null; report: Report | null }[];
  previous: { created_at: string; scores: { url: string; score: number }[] } | null;
};

/** A comparison whose owner turned on its share link. Only found by the exact slug. */
export const getSharedComparison = cache(async (slug: string): Promise<ComparisonData | null> => {
  if (!SLUG_PATTERN.test(slug)) return null;
  const { data } = await createPublicClient().rpc("get_shared_comparison", { p_slug: slug });
  const row = data as unknown as SharedRow | null;
  if (!row) return null;
  return {
    siteUrl: row.site_url,
    device: row.device,
    createdAt: row.created_at,
    sites: row.sites.map((s) => {
      const report = s.status === "completed" ? s.report : null;
      return { url: s.url, scanId: null, report, error: report ? null : (s.error ?? "This site couldn't be analyzed.") };
    }),
    previous: row.previous
      ? { createdAt: row.previous.created_at, scores: Object.fromEntries(row.previous.scores.map((p) => [p.url, p.score])) }
      : null,
  };
});
