import { compareSites, displayUrl, leaderIndex, type SiteComparison } from "@/lib/analyzer/compare";
import type { Report } from "@/lib/analyzer/types";

export type ComparisonSiteState = { url: string; scanId: string | null; report: Report | null; error: string | null };

export type ComparisonData = {
  siteUrl: string;
  device: string;
  createdAt: string;
  /** Position 0 is the owner's site. */
  sites: ComparisonSiteState[];
  previous: { createdAt: string; scores: Record<string, number> } | null;
};

export type AvailableSite = ComparisonSiteState & { report: Report; label: string };

export type MetricRow = { label: string; values: (number | undefined)[]; format: (v: number) => string; lowerIsBetter?: boolean; best: number };

export type ComparisonSummary = {
  you: ComparisonSiteState | undefined;
  rivals: ComparisonSiteState[];
  available: AvailableSite[];
  failed: ComparisonSiteState[];
  result: SiteComparison | null;
  leader: number;
  deltas: (number | undefined)[];
  metrics: MetricRow[];
};

function bestIndex(values: (number | undefined)[], lowerIsBetter?: boolean) {
  let best = -1;
  values.forEach((v, i) => {
    if (v == null) return;
    if (best === -1 || (lowerIsBetter ? v < values[best]! : v > values[best]!)) best = i;
  });
  return best;
}

export function formatKb(kb: number) {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

export function summarizeComparison(data: ComparisonData): ComparisonSummary {
  const [you, ...rivals] = data.sites;
  const available: AvailableSite[] = (you?.report ? [you, ...rivals] : [])
    .filter((s): s is ComparisonSiteState & { report: Report } => !!s.report)
    .map((s) => ({ ...s, label: displayUrl(s.url) }));
  const failed = rivals.filter((r) => !r.report);
  const result = available.length > 1 ? compareSites(available) : null;

  const deltas = available.map((s) => {
    const prev = data.previous?.scores[s.url];
    return prev == null ? undefined : s.report.overall.score - prev;
  });

  const m = available.map((s) => s.report.metrics);
  const rows: Omit<MetricRow, "best">[] = [
    { label: "Server response (TTFB)", values: m.map((x) => x.ttfbMs), format: (v) => `${v} ms`, lowerIsBetter: true },
    { label: "Page weight", values: m.map((x) => x.pageWeightKb), format: formatKb, lowerIsBetter: true },
    { label: "Requests", values: m.map((x) => x.requests), format: String, lowerIsBetter: true },
    { label: "Words on page", values: available.map((s) => s.report.page.wordCount), format: String },
  ];
  const metrics = rows
    .filter((row) => row.values.filter((v) => v != null).length > 1)
    .map((row) => ({ ...row, best: bestIndex(row.values, row.lowerIsBetter) }));

  return { you, rivals, available, failed, result, leader: result ? leaderIndex(result.overall) : 0, deltas, metrics };
}
