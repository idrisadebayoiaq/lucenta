import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, Globe, Wand2 } from "lucide-react";
import { LEGAL_CONTACT } from "@/components/legal-document";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Badge, EmptyState, Progress } from "@/components/ui/misc";
import { getCurrentProfile, createClient } from "@/lib/supabase/server";
import { MAX_TEXT_CHARS } from "@/lib/limits";
import { textCheckAiScore, textCheckLabel } from "@/lib/text-checks";
import { getDailyUsage } from "@/lib/usage";
import { aiScoreColor, cn, formatDateTime, scoreColor } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const QUICK_ACTIONS = [
  { href: "/dashboard/analyzer", icon: Globe, title: "Analyze a website", body: "Full audit with fixes" },
  { href: "/dashboard/detector", icon: Bot, title: "Detect AI text", body: "Check any content" },
  { href: "/dashboard/rewriter", icon: Wand2, title: "Improve your writing", body: "Suggestions and rewrites" },
];

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [usage, { data: scans }, { data: checks }] = await Promise.all([
    getDailyUsage(),
    supabase.from("scans").select("id,url,status,overall_score,grade,created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("text_checks").select("id,kind,title,word_count,ai_score_before,ai_score_after,created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  const firstName = profile?.full_name?.split(" ")[0];
  const meters = [
    { label: "Website audits", hint: "AI-powered site analysis", ...usage.scans },
    { label: "Texts (detector + rewriter)", hint: `Up to ${MAX_TEXT_CHARS.toLocaleString()} characters each`, ...usage.contents },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title={firstName ? `Welcome back, ${firstName}` : "Welcome to Lucenta"} description="Here's what's happening with your account." />

      {params.passwordReset && <Alert tone="success" title="Your password has been updated." />}

      <div className="grid gap-4 md:grid-cols-3">
        {QUICK_ACTIONS.map(({ href, icon: Icon, title, body }) => (
          <Link key={href} href={href} className="group brutal brutal-hover p-5">
            <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <p className="font-semibold">{title}</p>
            <p className="flex items-center justify-between text-sm text-muted-foreground">
              {body} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </p>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s free usage</CardTitle>
          <CardDescription>Lucenta is free for everyone. Limits reset every day at midnight UTC.</CardDescription>
        </CardHeader>
        {usage.shared && (
          <div className="px-6 pb-2">
            <Alert tone="info" title="Your daily limits are shared with another account on this device.">
              Each person gets one set of free limits per device. If this isn&apos;t right, email{" "}
              <a href={`mailto:${LEGAL_CONTACT}`} className="font-bold text-primary hover:underline">
                {LEGAL_CONTACT}
              </a>
              .
            </Alert>
          </div>
        )}
        <CardContent className="grid gap-6 md:grid-cols-2">
          {meters.map((m) => {
            const pct = (m.used / m.limit) * 100;
            return (
              <div key={m.label} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{m.label}</span>
                  <span className="font-medium">
                    {m.used} / {m.limit}
                  </span>
                </div>
                <Progress value={pct} barClassName={pct >= 100 ? "bg-rose-500" : pct >= 60 ? "bg-amber-500" : undefined} />
                <p className="text-xs text-muted-foreground">{m.hint}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent website scans</CardTitle>
            <Link href="/dashboard/history?tab=scans" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {scans && scans.length > 0 ? (
              <ul className="divide-y">
                {scans.map((s) => (
                  <li key={s.id}>
                    <Link href={`/dashboard/analyzer/${s.id}`} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{s.url.replace(/^https?:\/\//, "")}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(s.created_at)}</p>
                      </div>
                      {s.status === "completed" && s.overall_score != null ? (
                        <span className={cn("text-lg font-bold", scoreColor(s.overall_score))}>{s.overall_score}</span>
                      ) : (
                        <Badge tone={s.status === "failed" ? "danger" : "info"} className="capitalize">
                          {s.status}
                        </Badge>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={<Globe className="h-8 w-8" />} title="No scans yet" description="Analyze your first website to see it here." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent text checks</CardTitle>
            <Link href="/dashboard/history?tab=texts" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {checks && checks.length > 0 ? (
              <ul className="divide-y">
                {checks.map((c) => {
                  const score = textCheckAiScore(c);
                  return (
                    <li key={c.id}>
                      <Link href={`/dashboard/history/${c.id}`} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{c.title || "Untitled text"}</p>
                          <p className="text-xs text-muted-foreground">
                            {textCheckLabel(c.kind)} · {c.word_count} words · {formatDateTime(c.created_at)}
                          </p>
                        </div>
                        {score != null && <span className={cn("text-sm font-bold", aiScoreColor(score))}>{Math.round(score * 100)}% AI</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={<Bot className="h-8 w-8" />} title="No text checks yet" description="Check or improve some text to see it here." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
