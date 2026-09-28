import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronDown, Crown, ExternalLink, Trophy, XCircle, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Badge, ScoreRing } from "@/components/ui/misc";
import { compareSites, displayUrl, leaderIndex, type ComparedSite, type Gap } from "@/lib/analyzer/compare";
import { CATEGORY_LABELS, type Report } from "@/lib/analyzer/types";
import { createClient } from "@/lib/supabase/server";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { CompareActions } from "./compare-actions";

export const metadata: Metadata = { title: "Competitor comparison" };

const IMPACT_TONE = { high: "danger", medium: "warning", low: "info" } as const;
const EFFORT_TONE = { easy: "success", medium: "warning", hard: "danger" } as const;

type SiteState = { url: string; scanId: string | null; report: Report | null; error: string | null };

function Delta({ value }: { value: number | undefined }) {
  if (value == null || value === 0) return null;
  return (
    <Badge tone={value > 0 ? "success" : "danger"}>
      {value > 0 ? "+" : ""}
      {value}
    </Badge>
  );
}

function GapCard({ gap }: { gap: Gap }) {
  const rec = gap.recommendation;
  return (
    <details className="group rounded-2xl border">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-2xl p-4 hover:bg-muted/50">
        <div className="space-y-1.5">
          <p className="font-bold">{rec?.title ?? gap.title}</p>
          <p className="text-sm text-muted-foreground">
            {gap.aheadOf.join(", ")} {gap.aheadOf.length === 1 ? "passes" : "pass"} this check. Your site {gap.status === "fail" ? "fails" : "has a warning"}.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {rec && <Badge tone={IMPACT_TONE[rec.impact]}>{rec.impact} impact</Badge>}
            {rec && <Badge tone={EFFORT_TONE[rec.effort]}>{rec.effort} fix</Badge>}
            <Badge tone="outline">{CATEGORY_LABELS[gap.category]}</Badge>
          </div>
        </div>
        <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t px-4 py-3 text-sm">
        {rec ? (
          <>
            <p className="text-muted-foreground">{rec.why}</p>
            <div>
              <p className="mb-1 font-bold">How to fix</p>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                {rec.how.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">Open your full report to see the details for &ldquo;{gap.title}&rdquo;.</p>
        )}
      </div>
    </details>
  );
}

export default async function ComparisonPage({ params }: PageProps<"/dashboard/compare/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: comparison } = await supabase.from("comparisons").select("*").eq("id", id).maybeSingle();
  if (!comparison) notFound();

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

  const states: SiteState[] = (members ?? []).map((m) => {
    const scan = m.scan_id ? scanById.get(m.scan_id) : undefined;
    const result = Array.isArray(scan?.scan_results) ? scan.scan_results[0] : scan?.scan_results;
    const report = scan?.status === "completed" ? ((result?.report ?? null) as Report | null) : null;
    const error = report ? null : scan ? (scan.error ?? "This scan didn't finish.") : "This scan was deleted.";
    return { url: m.url, scanId: scan ? m.scan_id : null, report, error };
  });

  const previousScores = new Map<string, number>();
  if (previous) {
    const { data: prevMembers } = await supabase.from("comparison_sites").select("url,scan_id").eq("comparison_id", previous.id);
    const prevIds = (prevMembers ?? []).flatMap((m) => (m.scan_id ? [m.scan_id] : []));
    const { data: prevScans } = prevIds.length
      ? await supabase.from("scans").select("id,overall_score").in("id", prevIds)
      : { data: [] };
    const prevScore = new Map((prevScans ?? []).map((s) => [s.id, s.overall_score]));
    for (const m of prevMembers ?? []) {
      const score = m.scan_id ? prevScore.get(m.scan_id) : null;
      if (score != null) previousScores.set(m.url, score);
    }
  }

  const [you, ...rivals] = states;
  const available = [you, ...rivals.filter((r) => r.report)].filter((s): s is SiteState & { report: Report } => !!s?.report);
  const failed = rivals.filter((r) => !r.report);
  const canCompare = !!you?.report && available.length > 1;
  const sites: ComparedSite[] = available.map((s) => ({ label: displayUrl(s.url), report: s.report }));
  const result = canCompare ? compareSites(sites) : null;
  const deltas = available.map((s) => {
    const prev = previousScores.get(s.url);
    return prev == null ? undefined : s.report.overall.score - prev;
  });

  const m = available.map((s) => s.report.metrics);
  type MetricRow = { label: string; values: (number | undefined)[]; format: (v: number) => string; lowerIsBetter?: boolean };
  const allMetricRows: MetricRow[] = [
    { label: "Server response (TTFB)", values: m.map((x) => x.ttfbMs), format: (v) => `${v} ms`, lowerIsBetter: true },
    {
      label: "Page weight",
      values: m.map((x) => x.pageWeightKb),
      format: (v) => (v >= 1024 ? `${(v / 1024).toFixed(1)} MB` : `${v} KB`),
      lowerIsBetter: true,
    },
    { label: "Requests", values: m.map((x) => x.requests), format: String, lowerIsBetter: true },
    { label: "Words on page", values: available.map((s) => s.report.page.wordCount), format: String },
  ];
  const metricRows = allMetricRows.filter((row) => row.values.filter((v) => v != null).length > 1);

  const bestIndex = (values: (number | undefined)[], lowerIsBetter?: boolean) => {
    let best = -1;
    values.forEach((v, i) => {
      if (v == null) return;
      if (best === -1 || (lowerIsBetter ? v < values[best]! : v > values[best]!)) best = i;
    });
    return best;
  };

  return (
    <div className="space-y-6">
      <Link href="/dashboard/compare" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All comparisons
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">
            {displayUrl(comparison.site_url)} <span className="font-normal text-muted-foreground">vs {rivals.length} competitor{rivals.length === 1 ? "" : "s"}</span>
          </h1>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            {formatDateTime(comparison.created_at)} <Badge tone="outline" className="capitalize">{comparison.device}</Badge>
          </p>
        </div>
        <div className="flex gap-2">
          <CompareActions comparisonId={comparison.id} urls={states.map((s) => s.url)} device={comparison.device} />
        </div>
      </div>

      {!you?.report && (
        <Alert tone="danger" title="Your site's report isn't available">
          {you?.error} Re-run the comparison to scan it again.
        </Alert>
      )}
      {you?.report && !canCompare && (
        <Alert tone="danger" title="None of the competitors could be analyzed">
          Re-run the comparison, or start a new one with different competitors.
        </Alert>
      )}
      {failed.length > 0 && canCompare && (
        <Alert tone="warning" title={`${failed.length} competitor${failed.length === 1 ? "" : "s"} couldn't be analyzed`}>
          <ul className="mt-1 space-y-0.5">
            {failed.map((f) => (
              <li key={f.url}>
                <span className="font-medium text-foreground">{displayUrl(f.url)}</span>: {f.error}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {result && (
        <>
          <Card>
            <CardContent className="space-y-6 pt-6">
              <div className="flex items-center gap-3">
                <span className={cn("grid h-12 w-12 place-items-center rounded-full", result.rank === 1 ? "bg-amber-500/15 text-amber-500" : "bg-muted")}>
                  <Trophy className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xl font-extrabold">
                    {result.rank === 1 ? "You're ahead of the competition" : `You rank #${result.rank} of ${result.total}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {result.gaps.length === 0
                      ? "No competitor passes a check that you miss."
                      : `${result.gaps.length} check${result.gaps.length === 1 ? "" : "s"} where a competitor does better, ${result.quickWins.length} of them quick wins.`}
                    {previous && ` Changes are since your comparison on ${formatDate(previous.created_at)}.`}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {available.map((s, i) => (
                  <Link
                    key={s.url}
                    href={`/dashboard/analyzer/${s.scanId}`}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-colors hover:bg-muted/50",
                      i === 0 && "border-primary bg-primary/5",
                    )}
                  >
                    <ScoreRing score={s.report.overall.score} size={104} stroke={9} label={`Grade ${s.report.overall.grade}`} />
                    <span className="flex max-w-full items-center gap-1 truncate text-sm font-bold">
                      {i === leaderIndex(result.overall) && <Crown className="h-4 w-4 shrink-0 text-amber-500" />}
                      <span className="truncate">{displayUrl(s.url)}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {i === 0 ? "Your site" : "Competitor"} <Delta value={deltas[i]} />
                    </span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Side by side</CardTitle>
              <CardDescription>The best result in each row is highlighted. Click a site to open its full report.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 font-medium text-muted-foreground" />
                    {available.map((s, i) => (
                      <th key={s.url} className="max-w-40 truncate px-2 py-2 text-right font-bold">
                        <Link href={`/dashboard/analyzer/${s.scanId}`} className={cn("hover:text-primary", i === 0 && "text-primary")}>
                          {displayUrl(s.url)}
                          <ExternalLink className="ml-1 inline h-3 w-3" />
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    { label: "Overall", scores: result.overall, leader: leaderIndex(result.overall), strong: true },
                    ...result.categories.map((c) => ({ label: CATEGORY_LABELS[c.category], scores: c.scores, leader: c.leader, strong: false })),
                  ].map((row) => (
                    <tr key={row.label}>
                      <td className={cn("py-2.5", row.strong ? "font-bold" : "text-muted-foreground")}>{row.label}</td>
                      {row.scores.map((score, i) => (
                        <td key={i} className="px-2 py-2.5 text-right">
                          <span
                            className={cn(
                              "inline-block min-w-10 rounded-full px-2 py-0.5 text-center tabular-nums",
                              row.leader === i && "bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400",
                              row.strong && "font-bold",
                            )}
                          >
                            {score}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                  {metricRows.map((row) => {
                    const best = bestIndex(row.values, row.lowerIsBetter);
                    return (
                      <tr key={row.label}>
                        <td className="py-2.5 text-muted-foreground">{row.label}</td>
                        {row.values.map((v, i) => (
                          <td key={i} className="px-2 py-2.5 text-right">
                            <span
                              className={cn(
                                "inline-block rounded-full px-2 py-0.5 tabular-nums",
                                best === i && "bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400",
                              )}
                            >
                              {v == null ? "–" : row.format(v)}
                            </span>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  <tr>
                    <td className="py-2.5 align-top text-muted-foreground">Tech stack</td>
                    {available.map((s) => (
                      <td key={s.url} className="px-2 py-2.5 text-right align-top text-xs text-muted-foreground">
                        {s.report.techStack.length ? s.report.techStack.join(", ") : "–"}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" /> Quick wins
                </CardTitle>
                <CardDescription>Easy fixes that competitors already have.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.quickWins.length ? (
                  result.quickWins.map((g) => <GapCard key={g.key} gap={g} />)
                ) : (
                  <p className="text-sm text-muted-foreground">No easy gaps. See the full list below for bigger improvements.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Where you&apos;re ahead
                </CardTitle>
                <CardDescription>Checks you pass that competitors miss. Mention these in your pitch.</CardDescription>
              </CardHeader>
              <CardContent>
                {result.advantages.length ? (
                  <ul className="space-y-2.5">
                    {result.advantages.slice(0, 10).map((a) => (
                      <li key={a.key} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>
                          <span className="font-medium">{a.title}</span>
                          <span className="block text-xs text-muted-foreground">Missing on {a.behind.join(", ")}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Competitors pass everything you pass. Close the gaps below to pull ahead.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-rose-500" /> Where competitors beat you
              </CardTitle>
              <CardDescription>
                {result.gaps.length
                  ? `${result.gaps.length} checks, ordered by impact and effort.`
                  : "Nothing here: no competitor passes a check that you miss."}
              </CardDescription>
            </CardHeader>
            {result.gaps.length > 0 && (
              <CardContent className="space-y-3">
                {result.gaps.map((g) => (
                  <GapCard key={g.key} gap={g} />
                ))}
              </CardContent>
            )}
          </Card>
        </>
      )}
    </div>
  );
}