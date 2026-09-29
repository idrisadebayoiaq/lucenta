import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, EmptyState, Progress } from "@/components/ui/misc";
import { BookOpen } from "lucide-react";
import { RATE_LIMIT_PER_MINUTE } from "@/lib/api/handler";
import { MAX_ACTIVE_KEYS } from "@/lib/api/keys";
import { MIN_DETECT_WORDS } from "@/lib/detector/types";
import { DAILY_CONTENT_LIMIT, DAILY_SCAN_LIMIT, MAX_TEXT_CHARS } from "@/lib/limits";
import { SITE_URL } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { getDailyUsage, utcToday } from "@/lib/usage";
import { formatDateTime } from "@/lib/utils";
import { ApiKeysCard, CodeBlock, ScrollToButton, WebhookCard } from "./api-tools";

export const metadata: Metadata = { title: "Developer API" };

const ENDPOINTS = [
  ["POST", "/api/v1/audits", "Run a website audit and get the full report (waits until it finishes)."],
  ["GET", "/api/v1/audits", "List your audits, newest first."],
  ["GET", "/api/v1/audits/{id}", "Get one audit with its full report."],
  ["POST", "/api/v1/detect", "Check a text for AI-likelihood, with sentence scores."],
  ["GET", "/api/v1/usage", "Today's audits and texts left."],
];

const CONNECT_STEPS: { title: string; body: string; code?: { label: string; code: string }[] }[] = [
  {
    title: "Create an API key",
    body: "Use the API keys section above. Give it a name you'll recognise, like the name of your website, and copy the key straight away. It's only shown once.",
  },
  {
    title: "Save the key on your server",
    body: "Add it as an environment variable called LUCENTA_API_KEY in your .env file or your hosting settings (Vercel, Netlify, cPanel and so on). Never put it in front-end JavaScript, HTML, a mobile app or a public repo. If a key leaks, revoke it above and create a new one.",
    code: [{ label: ".env", code: "LUCENTA_API_KEY=lc_live_YOUR_KEY" }],
  },
  {
    title: "Call Lucenta from your server",
    body: "Your website form or app sends the URL or text to your own backend. Your backend calls Lucenta with the key and sends the result back. Here's the same idea in Node.js and PHP.",
    code: [
      {
        label: "Node.js / Next.js (app/api/audit/route.js)",
        code: `export async function POST(request) {
  const { url } = await request.json();
  const res = await fetch("${SITE_URL}/api/v1/audits", {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${process.env.LUCENTA_API_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, device: "mobile" }),
  });
  const data = await res.json();
  if (!res.ok) return Response.json({ error: data.error.message }, { status: res.status });
  return Response.json({ score: data.score, grade: data.grade, fixes: data.report.fixes });
}`,
      },
      {
        label: "PHP (WordPress, Laravel or plain PHP)",
        code: `<?php
$ch = curl_init("${SITE_URL}/api/v1/detect");
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 120,
  CURLOPT_HTTPHEADER => [
    "Authorization: Bearer " . getenv("LUCENTA_API_KEY"),
    "Content-Type: application/json",
  ],
  CURLOPT_POSTFIELDS => json_encode(["text" => $_POST["text"]]),
]);
$result = json_decode(curl_exec($ch), true);
echo $result["label"]; // likely_human, mixed or likely_ai`,
      },
    ],
  },
  {
    title: "Show the result to your users",
    body: "Audits return score, grade and report (with fixes, categories and metrics). Detection returns ai_probability, label and a score for each sentence. Use whichever fields you need in your own design.",
  },
  {
    title: "Get notified with a webhook (optional)",
    body: "Add your endpoint in the Webhook section above and we'll POST to it whenever an API audit finishes. Check the Lucenta-Signature header with your signing secret so you know the request really came from Lucenta.",
    code: [
      {
        label: "Verify a webhook (Node.js)",
        code: `import { createHmac, timingSafeEqual } from "node:crypto";

function isFromLucenta(rawBody, signatureHeader, secret) {
  const { t, v1 } = Object.fromEntries(signatureHeader.split(",").map((p) => p.split("=")));
  const expected = createHmac("sha256", secret).update(\`\${t}.\${rawBody}\`).digest("hex");
  return v1?.length === expected.length && timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
}`,
      },
    ],
  },
  {
    title: "Handle errors",
    body: "Every error has the same shape: { error: { code, message } }. Show the message to your users, and treat 429 as \"try again later\". Test your setup with GET /api/v1/usage. It doesn't use any of your limits.",
  },
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
        actions={
          <ScrollToButton target="how-to-connect">
            <BookOpen className="h-4 w-4" /> Read how to connect
          </ScrollToButton>
        }
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

      <Card id="how-to-connect" className="scroll-mt-24">
        <CardHeader>
          <CardTitle>How to connect Lucenta to your website or app</CardTitle>
          <CardDescription>
            Your website or app talks to your own server, and your server talks to Lucenta. That keeps your API key private.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <ol className="space-y-8">
            {CONNECT_STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{i + 1}</span>
                <div className="min-w-0 flex-1 space-y-3">
                  <p className="font-bold">{step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                  {step.code?.map((c) => (
                    <div key={c.label} className="space-y-2">
                      <p className="text-xs font-bold text-muted-foreground">{c.label}</p>
                      <CodeBlock code={c.code} />
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ol>

          <div className="rounded-xl border bg-muted/30 p-5">
            <p className="font-bold">Limits</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">{DAILY_SCAN_LIMIT} website audits</span> and{" "}
                <span className="font-medium text-foreground">{DAILY_CONTENT_LIMIT} different texts</span> per day. These are shared with your dashboard, so
                audits you run here count too.
              </li>
              <li>Limits reset every day at midnight UTC. Check what&apos;s left any time with GET /api/v1/usage.</li>
              <li>Up to {RATE_LIMIT_PER_MINUTE} requests per minute across all your keys.</li>
              <li>
                Texts need at least {MIN_DETECT_WORDS} words and can be up to {MAX_TEXT_CHARS.toLocaleString()} characters. Checking the same text again on
                the same day doesn&apos;t use another slot.
              </li>
              <li>An audit takes 20 to 60 seconds, so set your request timeout to at least 100 seconds.</li>
              <li>Up to {MAX_ACTIVE_KEYS} active API keys and one webhook per account.</li>
              <li>
                Going over a limit returns HTTP 429. Show your users a friendly message and try again later (after midnight UTC for daily limits, or after
                a minute for the rate limit).
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
