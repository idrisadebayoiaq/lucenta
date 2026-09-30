import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, Bot, Eye, Gauge, Globe, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin" };

type Named = { name: string; visitors: number };
type Overview = {
  from: string;
  to: string;
  series: { day: string; visitors: number; views: number; signups: number; scans: number; checks: number }[];
  pages: { path: string; views: number; visitors: number }[];
  referrers: Named[];
  countries: Named[];
  devices: Named[];
  browsers: Named[];
  vitals: { name: string; p75: number; samples: number; good: number; needs_improvement: number; poor: number }[];
  slow_pages: { path: string; lcp: number; samples: number }[];
  totals: {
    users: number;
    signups: number;
    scans: number;
    scans_failed: number;
    scan_seconds: number | null;
    checks: number;
    comparisons: number;
    api_requests: number;
    api_errors: number;
    api_ms: number | null;
  };
};

const RANGES = [7, 30, 90] as const;

/** Google's Core Web Vitals thresholds: [good up to, poor from]. */
const VITALS: { name: string; label: string; unit: "ms" | ""; good: number; poor: number; hint: string }[] = [
  { name: "LCP", label: "Largest Contentful Paint", unit: "ms", good: 2500, poor: 4000, hint: "How fast the main content shows" },
  { name: "INP", label: "Interaction to Next Paint", unit: "ms", good: 200, poor: 500, hint: "How fast the page reacts to taps and clicks" },
  { name: "CLS", label: "Cumulative Layout Shift", unit: "", good: 0.1, poor: 0.25, hint: "How much the layout jumps around" },
  { name: "FCP", label: "First Contentful Paint", unit: "ms", good: 1800, poor: 3000, hint: "When the first text or image appears" },
  { name: "TTFB", label: "Time to First Byte", unit: "ms", good: 800, poor: 1800, hint: "How fast the server starts responding" },
];

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const countryName = (code: string) => {
  if (code === "??") return "Unknown";
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
};

const fmt = (n: number) => n.toLocaleString("en-US");
const plural = (n: number, word: string) => `${fmt(n)} ${word}${n === 1 ? "" : "s"}`;
const fmtVital = (value: number, unit: string) => (unit === "ms" ? (value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`) : value.toFixed(3));
const shortDay = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function change(current: number, previous: number) {
  if (!previous) return current ? "New today" : "No change";
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}% vs yesterday`;
}

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Users; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function TrafficChart({ series }: { series: Overview["series"] }) {
  const max = Math.max(1, ...series.map((d) => d.views));
  const labelEvery = Math.ceil(series.length / 10);
  return (
    <div>
      <div className="flex h-56 items-end gap-[3px]">
        {series.map((d) => (
          <div key={d.day} className="group relative flex h-full flex-1 items-end" title={`${shortDay(d.day)}: ${d.visitors} visitors, ${d.views} page views`}>
            <div className="absolute bottom-0 w-full rounded-t bg-primary/20" style={{ height: `${(d.views / max) * 100}%` }} />
            <div className="relative w-full rounded-t bg-primary transition-opacity group-hover:opacity-80" style={{ height: `${(d.visitors / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-[3px] text-[10px] text-muted-foreground">
        {series.map((d, i) => (
          <span key={d.day} className="flex-1 truncate text-center">
            {i % labelEvery === 0 ? shortDay(d.day) : ""}
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-sm bg-primary" /> Visitors
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-sm bg-primary/20" /> Page views
        </span>
      </div>
    </div>
  );
}

function BarList({ rows, empty }: { rows: { label: string; value: number; sub?: string; display?: string }[]; empty: string }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="relative flex items-center justify-between gap-3 overflow-hidden rounded-lg px-3 py-2 text-sm">
          <div className="absolute inset-y-0 left-0 rounded-lg bg-primary/10" style={{ width: `${(r.value / max) * 100}%` }} />
          <span className="relative truncate font-medium">{r.label}</span>
          <span className="relative shrink-0 tabular-nums text-muted-foreground">
            {r.sub && <span className="mr-2 text-xs">{r.sub}</span>}
            <span className="font-bold text-foreground">{r.display ?? fmt(r.value)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function VitalCard({ vital, data }: { vital: (typeof VITALS)[number]; data?: Overview["vitals"][number] }) {
  if (!data) {
    return (
      <div className="rounded-2xl border bg-card p-5">
        <p className="text-sm font-bold">{vital.name}</p>
        <p className="text-xs text-muted-foreground">{vital.label}</p>
        <p className="mt-3 text-2xl font-bold text-muted-foreground">-</p>
        <p className="mt-1 text-xs text-muted-foreground">No data yet</p>
      </div>
    );
  }
  const status = data.p75 <= vital.good ? "good" : data.p75 < vital.poor ? "ok" : "poor";
  const tone = { good: "text-emerald-500", ok: "text-amber-500", poor: "text-rose-500" }[status];
  const pct = (n: number) => `${(n / data.samples) * 100}%`;
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-sm font-bold">{vital.name}</p>
      <p className="text-xs text-muted-foreground">{vital.label}</p>
      <p className={cn("mt-3 text-2xl font-bold", tone)}>{fmtVital(data.p75, vital.unit)}</p>
      <p className="text-xs text-muted-foreground">
        {status === "good" ? "Good" : status === "ok" ? "Needs improvement" : "Poor"} · {plural(data.samples, "sample")}
      </p>
      <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="bg-emerald-500" style={{ width: pct(data.good) }} />
        <div className="bg-amber-500" style={{ width: pct(data.needs_improvement) }} />
        <div className="bg-rose-500" style={{ width: pct(data.poor) }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{vital.hint}</p>
    </div>
  );
}

export default async function AdminPage({ searchParams }: PageProps<"/dashboard/admin">) {
  const profile = await getCurrentProfile();
  if (!profile?.is_admin) notFound();

  const params = await searchParams;
  const days = RANGES.find((r) => String(r) === params.days) ?? 30;
  const { data, error } = await createAdminClient().rpc("admin_overview", { p_days: days });
  if (error || !data) throw new Error("Could not load analytics.");
  const o = data as unknown as Overview;

  const today = o.series.at(-1)!;
  const yesterday = o.series.at(-2) ?? { visitors: 0, views: 0 };
  const visitors = o.series.reduce((s, d) => s + d.visitors, 0);
  const views = o.series.reduce((s, d) => s + d.views, 0);
  const t = o.totals;
  const hasTraffic = views > 0;
  const activeDays = o.series.filter((d) => d.visitors || d.views || d.signups || d.scans || d.checks).reverse();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin"
        description="Visitors, performance and activity across Lucenta. Times are in UTC."
        actions={
          <div className="flex rounded-full border p-1">
            {RANGES.map((r) => (
              <Link
                key={r}
                href={`/dashboard/admin?days=${r}`}
                className={cn("rounded-full px-4 py-1.5 text-sm font-medium", r === days ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
              >
                {r} days
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label="Visitors today" value={fmt(today.visitors)} hint={change(today.visitors, yesterday.visitors)} />
        <Stat icon={Eye} label="Page views today" value={fmt(today.views)} hint={change(today.views, yesterday.views)} />
        <Stat icon={Globe} label={`Visitors, last ${days} days`} value={fmt(visitors)} hint={`${fmt(views)} page views · ${visitors ? (views / visitors).toFixed(1) : "0"} per visitor`} />
        <Stat icon={UserPlus} label={`Sign-ups, last ${days} days`} value={fmt(t.signups)} hint={`${fmt(t.users)} accounts in total`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily visitors</CardTitle>
          <CardDescription>
            {shortDay(o.from)} to {shortDay(o.to)}. A visitor is one device per day, counted without cookies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasTraffic ? (
            <TrafficChart series={o.series} />
          ) : (
            <EmptyState icon={<Activity className="h-8 w-8" />} title="No visits recorded yet" description="Visits are counted on the live site from now on. Check back after some traffic." />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top pages</CardTitle>
            <CardDescription>Page views, with visitors next to them</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList rows={o.pages.map((p) => ({ label: p.path, value: p.views, sub: plural(p.visitors, "visitor") }))} empty="No page views yet" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Where visitors come from</CardTitle>
            <CardDescription>&quot;Direct&quot; means typed in, bookmarked or opened from an app</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList rows={o.referrers.map((r) => ({ label: r.name, value: r.visitors }))} empty="No visitors yet" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Countries</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList rows={o.countries.map((c) => ({ label: countryName(c.name), value: c.visitors }))} empty="No visitors yet" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Devices and browsers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <BarList rows={o.devices.map((d) => ({ label: d.name[0].toUpperCase() + d.name.slice(1), value: d.visitors }))} empty="No visitors yet" />
            {o.browsers.length > 0 && <BarList rows={o.browsers.map((b) => ({ label: b.name, value: b.visitors }))} empty="" />}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Gauge className="h-5 w-5" /> Website performance
        </h2>
        <p className="text-sm text-muted-foreground">
          Measured in real visitors&apos; browsers. Each number is the 75th percentile: 3 in 4 visits were this fast or faster.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {VITALS.map((v) => (
          <VitalCard key={v.name} vital={v} data={o.vitals.find((d) => d.name === v.name)} />
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Slowest pages</CardTitle>
          <CardDescription>Largest Contentful Paint (75th percentile). Aim for under 2.5 s.</CardDescription>
        </CardHeader>
        <CardContent>
          <BarList rows={o.slow_pages.map((p) => ({ label: p.path, value: p.lcp, sub: plural(p.samples, "sample"), display: fmtVital(p.lcp, "ms") }))} empty="No performance data yet" />
        </CardContent>
      </Card>

      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Bot className="h-5 w-5" /> App activity, last {days} days
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Globe}
          label="Website audits"
          value={fmt(t.scans)}
          hint={`${t.scans ? Math.round(((t.scans - t.scans_failed) / t.scans) * 100) : 100}% succeeded${t.scan_seconds != null ? ` · ${t.scan_seconds}s on average` : ""}`}
        />
        <Stat icon={Bot} label="Text checks" value={fmt(t.checks)} hint="AI Detector, suggestions and rewrites" />
        <Stat icon={Activity} label="Competitor comparisons" value={fmt(t.comparisons)} />
        <Stat
          icon={Gauge}
          label="Developer API requests"
          value={fmt(t.api_requests)}
          hint={t.api_requests ? `${fmt(t.api_errors)} server errors · ${t.api_ms ?? 0} ms average` : "No requests yet"}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Daily activity</CardTitle>
          <CardDescription>Days with no activity are hidden</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {activeDays.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No activity in this period</p>
          ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-4 font-medium">Day</th>
                <th className="py-2 pr-4 text-right font-medium">Visitors</th>
                <th className="py-2 pr-4 text-right font-medium">Page views</th>
                <th className="py-2 pr-4 text-right font-medium">Sign-ups</th>
                <th className="py-2 pr-4 text-right font-medium">Audits</th>
                <th className="py-2 text-right font-medium">Text checks</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {activeDays.map((d) => (
                <tr key={d.day} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{shortDay(d.day)}</td>
                  <td className="py-2 pr-4 text-right">{fmt(d.visitors)}</td>
                  <td className="py-2 pr-4 text-right">{fmt(d.views)}</td>
                  <td className="py-2 pr-4 text-right">{fmt(d.signups)}</td>
                  <td className="py-2 pr-4 text-right">{fmt(d.scans)}</td>
                  <td className="py-2 text-right">{fmt(d.checks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
