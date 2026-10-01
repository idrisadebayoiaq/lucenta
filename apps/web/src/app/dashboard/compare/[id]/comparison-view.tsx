import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2, ChevronDown, Crown, ExternalLink, Trophy, XCircle, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Badge, ScoreRing } from "@/components/ui/misc";
import { displayUrl, type Gap } from "@/lib/analyzer/compare";
import { CATEGORY_LABELS } from "@/lib/analyzer/types";
import { summarizeComparison, type AvailableSite, type ComparisonData } from "@/lib/comparisons/data";
import { cn, formatDate } from "@/lib/utils";

const IMPACT_TONE = { high: "danger", medium: "warning", low: "info" } as const;
const EFFORT_TONE = { easy: "success", medium: "warning", hard: "danger" } as const;

function Delta({ value }: { value: number | undefined }) {
  if (value == null || value === 0) return null;
  return (
    <Badge tone={value > 0 ? "success" : "danger"}>
      {value > 0 ? "+" : ""}
      {value}
    </Badge>
  );
}

function GapCard({ gap, site }: { gap: Gap; site: string }) {
  const rec = gap.recommendation;
  return (
    <details className="group brutal">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-2xl p-4 hover:bg-muted/50">
        <div className="space-y-1.5">
          <p className="font-bold">{rec?.title ?? gap.title}</p>
          <p className="text-sm text-muted-foreground">
            {gap.aheadOf.join(", ")} {gap.aheadOf.length === 1 ? "passes" : "pass"} this check. {site} {gap.status === "fail" ? "fails" : "has a warning"}.
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
          <p className="text-muted-foreground">This check is listed in the full website report for &ldquo;{gap.title}&rdquo;.</p>
        )}
      </div>
    </details>
  );
}

/** `siteHref` links each site to its full report; omit it on public pages, where individual reports are private. */
export function ComparisonView({ data, siteHref }: { data: ComparisonData; siteHref?: (site: AvailableSite) => string | null }) {
  const { you, available, failed, result, leader, deltas, metrics } = summarizeComparison(data);

  const SiteLink = ({ site, className, children }: { site: AvailableSite; className?: string; children: ReactNode }) => {
    const href = siteHref?.(site);
    return href ? (
      <Link href={href} className={className}>
        {children}
      </Link>
    ) : (
      <div className={className}>{children}</div>
    );
  };

  return (
    <>
      {!you?.report && (
        <Alert tone="danger" title="The main site's report isn't available">
          {you?.error} {siteHref ? "Re-run the comparison to scan it again." : ""}
        </Alert>
      )}
      {you?.report && !result && (
        <Alert tone="danger" title="None of the competitors could be analyzed">
          {siteHref ? "Re-run the comparison, or start a new one with different competitors." : "There's nothing to compare yet."}
        </Alert>
      )}
      {failed.length > 0 && result && (
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
                    {result.rank === 1 ? `${available[0].label} is ahead of the competition` : `${available[0].label} ranks #${result.rank} of ${result.total}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {result.gaps.length === 0
                      ? "No competitor passes a check that this site misses."
                      : `${result.gaps.length} check${result.gaps.length === 1 ? "" : "s"} where a competitor does better, ${result.quickWins.length} of them quick wins.`}
                    {data.previous && ` Changes are since the comparison on ${formatDate(data.previous.createdAt)}.`}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {available.map((s, i) => (
                  <SiteLink
                    key={s.url}
                    site={s}
                    className={cn(
                      "flex flex-col items-center gap-2 brutal p-4 text-center transition-colors",
                      siteHref && "hover:bg-muted/50",
                      i === 0 && "border-primary bg-primary/5",
                    )}
                  >
                    <ScoreRing score={s.report.overall.score} size={104} stroke={9} label={`Grade ${s.report.overall.grade}`} />
                    <span className="flex max-w-full items-center gap-1 truncate text-sm font-bold">
                      {i === leader && <Crown className="h-4 w-4 shrink-0 text-amber-500" />}
                      <span className="truncate">{s.label}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {i === 0 ? "Main site" : "Competitor"} <Delta value={deltas[i]} />
                    </span>
                  </SiteLink>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Side by side</CardTitle>
              <CardDescription>
                The best result in each row is highlighted.{siteHref ? " Click a site to open its full report." : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 font-medium text-muted-foreground" />
                    {available.map((s, i) => (
                      <th key={s.url} className="max-w-40 truncate px-2 py-2 text-right font-bold">
                        {siteHref?.(s) ? (
                          <Link href={siteHref(s)!} className={cn("hover:text-primary", i === 0 && "text-primary")}>
                            {s.label}
                            <ExternalLink className="ml-1 inline h-3 w-3" />
                          </Link>
                        ) : (
                          <span className={cn(i === 0 && "text-primary")}>{s.label}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    { label: "Overall", scores: result.overall, leader, strong: true },
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
                  {metrics.map((row) => (
                    <tr key={row.label}>
                      <td className="py-2.5 text-muted-foreground">{row.label}</td>
                      {row.values.map((v, i) => (
                        <td key={i} className="px-2 py-2.5 text-right">
                          <span
                            className={cn(
                              "inline-block rounded-full px-2 py-0.5 tabular-nums",
                              row.best === i && "bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400",
                            )}
                          >
                            {v == null ? "–" : row.format(v)}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
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
                  result.quickWins.map((g) => <GapCard key={g.key} gap={g} site={available[0].label} />)
                ) : (
                  <p className="text-sm text-muted-foreground">No easy gaps. See the full list below for bigger improvements.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Where {available[0].label} is ahead
                </CardTitle>
                <CardDescription>Checks this site passes that competitors miss.</CardDescription>
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
                  <p className="text-sm text-muted-foreground">Competitors pass everything this site passes.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-rose-500" /> Where competitors do better
              </CardTitle>
              <CardDescription>
                {result.gaps.length
                  ? `${result.gaps.length} checks, ordered by impact and effort.`
                  : "Nothing here: no competitor passes a check that this site misses."}
              </CardDescription>
            </CardHeader>
            {result.gaps.length > 0 && (
              <CardContent className="space-y-3">
                {result.gaps.map((g) => (
                  <GapCard key={g.key} gap={g} site={available[0].label} />
                ))}
              </CardContent>
            )}
          </Card>
        </>
      )}
    </>
  );
}
