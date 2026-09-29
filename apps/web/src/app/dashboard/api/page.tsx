import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, EmptyState, Progress } from "@/components/ui/misc";
import { RATE_LIMIT_PER_MINUTE } from "@/lib/api/handler";
import { MAX_ACTIVE_KEYS } from "@/lib/api/keys";
import { SITE_URL } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { getDailyUsage, utcToday } from "@/lib/usage";
import { formatDateTime } from "@/lib/utils";
import { ApiKeysCard, CodeBlock, WebhookCard } from "./api-tools";

export const metadata: Metadata = { title: "Developer API" };

const ENDPOINTS = [
  ["POST", "/api/v1/audits", "Run a website audit and get the full report (waits until it finishes)."],
  ["GET", "/api/v1/audits", "List your audits, newest first."],
  ["GET", "/api/v1/audits/{id}", "Get one audit with its full report."],
  ["POST", "/api/v1/detect", "Check a text for AI-likelihood, with sentence scores."],
  ["GET", "/api/v1/usage", "Today's audits and texts left."],
];

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export default async function ApiPage() {
  const supabase = await createClient();
  const since30 = daysAgo(30);
  const [{ data: keys }, { data: webhook }, { data: requests }, { count: today }, { count: month }, usage] = await Promise.all([
    supabase.from("api_keys").select("id,name,prefix,created_at,last_used_at,revoked_at").order("created_at", { ascending: false }),
    supabase.from("api_webhooks").select("url,secret,enabled,last_status,last_error,last_delivered_at").maybeSingle(),
    supabase.from("api_requests").select("id,method,path,status,duration_ms,created_at").order("created_at", { ascending: false }).limit(15),
    supabase.from("api_requests").select("id", { count: "exact", head: true }).gte("created_at", `${utcToday()}T00:00:00Z`),
    supabase.from("api_requests").select("id", { count: "exact", head: true }).gte("created_at", since30),
    getDailyUsage(),
  ]);

  const quota = [
    { label: "Website audits today", ...usage.scans },
    { label: "Texts today", ...usage.contents },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Developer API"
        description="Run website audits and AI detection from your own apps, scripts and workflows."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quota.map((q) => (
          <Card key={q.label}>
            <CardContent className="space-y-2 pt-6">
              <p className="text-sm text-muted-foreground">{q.label}</p>
              <p className="text-2xl font-bold">
                {q.used} <span className="text-base font-normal text-muted-foreground">/ {q.limit}</span>
              </p>
              <Progress value={(q.used / q.limit) * 100} />
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="space-y-1 pt-6">
            <p className="text-sm text-muted-foreground">API requests today</p>
            <p className="text-2xl font-bold">{today ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 pt-6">
            <p className="text-sm text-muted-foreground">Last 30 days</p>
            <p className="text-2xl font-bold">{month ?? 0}</p>
          </CardContent>
        </Card>
      </div>
      <p className="-mt-4 text-sm text-muted-foreground">
        API requests share your account&apos;s daily limits with the dashboard, and reset at midnight UTC. Up to {RATE_LIMIT_PER_MINUTE} requests per minute.
      </p>

      <ApiKeysCard keys={keys ?? []} maxKeys={MAX_ACTIVE_KEYS} />
      <WebhookCard webhook={webhook} />

      <Card>
        <CardHeader>
          <CardTitle>Quick start</CardTitle>
          <CardDescription>Send your key in the Authorization header. Keep it on your server and never put it in browser code.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-bold">Run a website audit</p>
            <CodeBlock
              code={`curl -X POST ${SITE_URL}/api/v1/audits \\
  -H "Authorization: Bearer lc_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "example.com", "device": "mobile"}'`}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-bold">Check a text for AI writing</p>
            <CodeBlock
              code={`const res = await fetch("${SITE_URL}/api/v1/detect", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.LUCENTA_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ text: "Paste at least 80 words here..." }),
});
const result = await res.json(); // { ai_probability, label, sentences, ... }`}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 font-medium">Endpoint</th>
                  <th className="py-2 font-medium">What it does</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ENDPOINTS.map(([method, path, what]) => (
                  <tr key={method + path}>
                    <td className="whitespace-nowrap py-3 pr-4 font-mono text-xs">
                      <Badge tone={method === "POST" ? "default" : "success"} className="mr-2 font-mono">
                        {method}
                      </Badge>
                      {path}
                    </td>
                    <td className="py-3 text-muted-foreground">{what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">
            Errors come back as <code className="font-mono text-xs">{`{ "error": { "code", "message" } }`}</code> with a matching HTTP status: 400 bad input,
            401 bad key, 404 not found, 422 audit failed, 429 daily or rate limit.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent requests</CardTitle>
        </CardHeader>
        <CardContent>
          {requests && requests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 font-medium">Request</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 font-medium">Time</th>
                    <th className="py-2 text-right font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td className="py-3 font-mono text-xs">
                        {r.method} {r.path}
                      </td>
                      <td className="py-3">
                        <Badge tone={r.status < 300 ? "success" : r.status < 500 ? "warning" : "danger"}>{r.status}</Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">{(r.duration_ms / 1000).toFixed(1)}s</td>
                      <td className="py-3 text-right text-muted-foreground">{formatDateTime(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No requests yet" description="Create a key and make your first request. It will show up here." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
