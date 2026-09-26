"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Info, Sparkles, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Badge, ScoreRing } from "@/components/ui/misc";
import { CATEGORY_LABELS, type Category, type Check, type Recommendation, type Report } from "@/lib/analyzer/types";
import { cn } from "@/lib/utils";

const STATUS_ICON = {
  pass: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  warn: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  fail: <XCircle className="h-4 w-4 text-rose-500" />,
  info: <Info className="h-4 w-4 text-sky-500" />,
};

const IMPACT_TONE = { high: "danger", medium: "warning", low: "info" } as const;
const EFFORT_TONE = { easy: "success", medium: "warning", hard: "danger" } as const;

function vitalsRating(metric: "lcp" | "cls" | "inp" | "fcp" | "tbt" | "ttfb", value: number) {
  const thresholds = { lcp: [2500, 4000], cls: [0.1, 0.25], inp: [200, 500], fcp: [1800, 3000], tbt: [200, 600], ttfb: [800, 1800] }[metric];
  return value <= thresholds[0] ? "good" : value <= thresholds[1] ? "needs work" : "poor";
}

function RecommendationCard({ rec, defaultOpen }: { rec: Recommendation; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="rounded-2xl border">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full cursor-pointer items-start justify-between gap-3 rounded-2xl p-4 text-left hover:bg-muted/50">
        <div className="space-y-1.5">
          <p className="font-bold">{rec.title}</p>
          <div className="flex flex-wrap gap-1.5">
            {rec.source === "ai" && (
              <Badge>
                <Sparkles className="h-3 w-3" /> AI insight
              </Badge>
            )}
            <Badge tone={IMPACT_TONE[rec.impact]}>{rec.impact} impact</Badge>
            <Badge tone={EFFORT_TONE[rec.effort]}>{rec.effort} fix</Badge>
            <Badge tone="outline">{CATEGORY_LABELS[rec.category]}</Badge>
          </div>
        </div>
        <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-3 border-t px-4 py-3 text-sm">
          <p className="text-muted-foreground">{rec.why}</p>
          <div>
            <p className="mb-1 font-bold">How to fix</p>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              {rec.how.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckRow({ check }: { check: Check }) {
  const [open, setOpen] = useState(false);
  const hasDetails = !!check.details?.length;
  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5">{STATUS_ICON[check.status]}</span>
          <div>
            <p className="text-sm font-medium">{check.title}</p>
            {check.value && <p className="break-all text-xs text-muted-foreground">{check.value}</p>}
          </div>
        </div>
        {hasDetails && (
          <button onClick={() => setOpen((o) => !o)} className="shrink-0 text-xs text-primary hover:underline cursor-pointer">
            {open ? "Hide" : `Show ${check.details!.length}`}
          </button>
        )}
      </div>
      {open && hasDetails && (
        <ul className="mt-2 max-h-48 space-y-1 overflow-auto rounded-md bg-muted/50 p-2 pl-8 text-xs text-muted-foreground">
          {check.details!.map((d) => (
            <li key={d} className="break-all">
              {d}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function ReportView({ report }: { report: Report }) {
  const categories = Object.keys(CATEGORY_LABELS) as Category[];
  const [tab, setTab] = useState<Category>("performance");
  const m = report.metrics;

  const metricTiles: { label: string; value: string; rating?: string }[] = [
    { label: "Server response (TTFB)", value: `${m.ttfbMs} ms`, rating: vitalsRating("ttfb", m.ttfbMs) },
    ...(m.lcp != null ? [{ label: "Largest Contentful Paint", value: `${(m.lcp / 1000).toFixed(1)} s`, rating: vitalsRating("lcp", m.lcp) }] : []),
    ...(m.inp != null ? [{ label: "Interaction to Next Paint", value: `${Math.round(m.inp)} ms`, rating: vitalsRating("inp", m.inp) }] : []),
    ...(m.cls != null ? [{ label: "Cumulative Layout Shift", value: m.cls.toFixed(2), rating: vitalsRating("cls", m.cls) }] : []),
    ...(m.fcp != null ? [{ label: "First Contentful Paint", value: `${(m.fcp / 1000).toFixed(1)} s`, rating: vitalsRating("fcp", m.fcp) }] : []),
    ...(m.tbt != null ? [{ label: "Total Blocking Time", value: `${Math.round(m.tbt)} ms`, rating: vitalsRating("tbt", m.tbt) }] : []),
    ...(m.pageWeightKb != null
      ? [{ label: "Page weight", value: m.pageWeightKb >= 1024 ? `${(m.pageWeightKb / 1024).toFixed(1)} MB` : `${m.pageWeightKb} KB` }]
      : []),
    ...(m.requests != null ? [{ label: "Requests", value: String(m.requests) }] : []),
    { label: "HTML size", value: `${m.htmlKb} KB` },
    { label: "Redirects", value: String(m.redirects) },
    { label: "Words on page", value: String(report.page.wordCount) },
  ];

  const ratingTone = (r?: string) => (r === "good" ? "success" : r === "poor" ? "danger" : r ? "warning" : undefined);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="grid gap-8 pt-6 lg:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center gap-2">
            <ScoreRing score={report.overall.score} size={160} stroke={12} label={`Grade ${report.overall.grade}`} />
            <p className="text-sm text-muted-foreground">Overall score</p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setTab(c);
                  document.getElementById("checks")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex flex-col items-center gap-2 rounded-lg p-2 hover:bg-muted cursor-pointer"
              >
                <ScoreRing score={report.categories[c].score} size={72} stroke={6} />
                <span className="text-center text-xs text-muted-foreground">{CATEGORY_LABELS[c]}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {report.summary ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI review
            </CardTitle>
            {report.ai?.audience && <CardDescription>Audience: {report.ai.audience}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[15px] leading-relaxed">{report.summary}</p>
            {!!report.ai?.strengths.length && (
              <div>
                <p className="mb-2 text-sm font-bold">What&apos;s working</p>
                <ul className="space-y-1.5">
                  {report.ai.strengths.map((s) => (
                    <li key={s} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Fix these first</CardTitle>
            <CardDescription>
              {report.recommendations.length} recommendations, ordered by impact and effort
              {report.recommendations.some((r) => r.source === "ai") ? ", including issues spotted by the AI review." : "."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.recommendations.length === 0 ? (
              <Alert tone="success" title="Great job! No major issues found." />
            ) : (
              report.recommendations.slice(0, 8).map((rec, i) => <RecommendationCard key={rec.id} rec={rec} defaultOpen={i === 0} />)
            )}
            {report.recommendations.length > 8 && (
              <details className="group">
                <summary className="cursor-pointer list-none text-sm font-medium text-primary">
                  Show {report.recommendations.length - 8} more recommendations
                </summary>
                <div className="mt-3 space-y-3">
                  {report.recommendations.slice(8).map((rec) => (
                    <RecommendationCard key={rec.id} rec={rec} />
                  ))}
                </div>
              </details>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>What&apos;s missing</CardTitle>
            </CardHeader>
            <CardContent>
              {report.missing.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing essential is missing.</p>
              ) : (
                <ul className="space-y-2">
                  {report.missing.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-sm">
                      <XCircle className="h-4 w-4 shrink-0 text-rose-500" /> {item.title}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tech stack</CardTitle>
            </CardHeader>
            <CardContent>
              {report.techStack.length ? (
                <div className="flex flex-wrap gap-2">
                  {report.techStack.map((t) => (
                    <Badge key={t} tone="outline">
                      {t}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No common technologies detected.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Metrics</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {metricTiles.map((t) => (
            <div key={t.label} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{t.label}</p>
              <p className="mt-1 text-xl font-semibold">{t.value}</p>
              {t.rating && (
                <Badge tone={ratingTone(t.rating)} className="mt-1 capitalize">
                  {t.rating}
                </Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card id="checks">
        <CardHeader>
          <CardTitle>All checks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-1 overflow-x-auto border-b">
            {categories.map((c) => {
              const fails = report.categories[c].checks.filter((ch) => ch.status === "fail").length;
              return (
                <button
                  key={c}
                  onClick={() => setTab(c)}
                  className={cn(
                    "flex shrink-0 cursor-pointer items-center gap-1.5 border-b-4 px-4 py-3 text-[15px] transition-colors hover:bg-muted",
                    tab === c ? "border-primary font-bold text-foreground" : "border-transparent font-medium text-muted-foreground",
                  )}
                >
                  {CATEGORY_LABELS[c]}
                  {fails > 0 && <span className="rounded-full bg-rose-500/10 px-1.5 text-xs text-rose-600">{fails}</span>}
                </button>
              );
            })}
          </div>
          <ul className="divide-y">
            {report.categories[tab].checks.map((check) => (
              <CheckRow key={`${check.category}-${check.id}`} check={check} />
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
