"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, RefreshCw, Send, Trash2, Webhook } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Alert, Badge, EmptyState } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/utils";
import { createApiKey, deleteWebhook, revokeApiKey, rotateWebhookSecret, saveWebhook, sendTestWebhook } from "./actions";

type ApiKey = { id: string; name: string; prefix: string; created_at: string; last_used_at: string | null; revoked_at: string | null };
type WebhookRow = {
  url: string;
  secret: string;
  enabled: boolean;
  last_status: number | null;
  last_error: string | null;
  last_delivered_at: string | null;
} | null;

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

export function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl border bg-muted/40 p-4 pr-24 font-mono text-xs leading-relaxed">{code}</pre>
      <div className="absolute right-2 top-2">
        <CopyButton value={code} />
      </div>
    </div>
  );
}

export function ApiKeysCard({ keys, maxKeys }: { keys: ApiKey[]; maxKeys: number }) {
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const active = keys.filter((k) => !k.revoked_at);

  function create() {
    startTransition(async () => {
      const res = await createApiKey(name || "Default key");
      if (!res.ok) return void toast.error(res.error);
      setNewKey(res.key);
      setName("");
    });
  }

  function revoke(key: ApiKey) {
    if (!confirm(`Revoke "${key.name}"? Apps using it will stop working immediately.`)) return;
    startTransition(async () => {
      const res = await revokeApiKey(key.id);
      if (!res.ok) toast.error(res.error);
      else toast.success("Key revoked.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API keys</CardTitle>
        <CardDescription>
          Up to {maxKeys} active keys. Create one per app so you can revoke it on its own.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {newKey && (
          <Alert tone="success" title="Your new API key">
            <p className="mt-1">Copy it now. For your security it won&apos;t be shown again.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <code className="min-w-0 flex-1 break-all rounded-lg border bg-background px-3 py-2 font-mono text-xs text-foreground">{newKey}</code>
              <CopyButton value={newKey} />
            </div>
          </Alert>
        )}

        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name, e.g. Agency dashboard" maxLength={60} aria-label="Key name" />
          <Button type="submit" size="lg" className="shrink-0" loading={pending} disabled={active.length >= maxKeys}>
            {!pending && <KeyRound className="h-4 w-4" />} Create key
          </Button>
        </form>

        {keys.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 font-medium">Name</th>
                  <th className="py-2 font-medium">Key</th>
                  <th className="py-2 font-medium">Last used</th>
                  <th className="py-2 text-right font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {keys.map((k) => (
                  <tr key={k.id} className={k.revoked_at ? "opacity-60" : undefined}>
                    <td className="py-3 font-medium">{k.name}</td>
                    <td className="py-3 font-mono text-xs text-muted-foreground">{k.prefix}••••••••</td>
                    <td className="py-3 text-muted-foreground">{k.last_used_at ? formatDateTime(k.last_used_at) : "Never"}</td>
                    <td className="py-3 text-right">
                      {k.revoked_at ? (
                        <Badge tone="outline">Revoked</Badge>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-rose-500" onClick={() => revoke(k)} disabled={pending}>
                          <Trash2 className="h-4 w-4" /> Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<KeyRound className="h-8 w-8" />} title="No API keys yet" description="Create your first key to start using the API." />
        )}
      </CardContent>
    </Card>
  );
}

export function WebhookCard({ webhook }: { webhook: WebhookRow }) {
  const [url, setUrl] = useState(webhook?.url ?? "");
  const [enabled, setEnabled] = useState(webhook?.enabled ?? true);
  const [showSecret, setShowSecret] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const res = await action();
      if (!res.ok) toast.error(res.error ?? "Something went wrong.");
      else toast.success(success);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" /> Webhook
        </CardTitle>
        <CardDescription>
          We POST <code className="font-mono text-xs">audit.completed</code> and <code className="font-mono text-xs">audit.failed</code> events to this
          URL when an API audit finishes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="webhook-url">Endpoint URL</Label>
          <Input id="webhook-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-app.com/webhooks/lucenta" />
        </div>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-primary" />
          Send events to this URL
        </label>

        {webhook && (
          <>
            <div className="space-y-2">
              <Label>Signing secret</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <code className="min-w-0 flex-1 break-all rounded-lg border bg-muted/40 px-3 py-2 font-mono text-xs">
                  {showSecret ? webhook.secret : `whsec_${"•".repeat(24)}`}
                </code>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowSecret((s) => !s)}>
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {showSecret ? "Hide" : "Show"}
                  </Button>
                  <CopyButton value={webhook.secret} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Every request has a <code className="font-mono">Lucenta-Signature: t=…,v1=…</code> header. v1 is the HMAC-SHA256 of{" "}
                <code className="font-mono">{"`${t}.${rawBody}`"}</code> with this secret.
              </p>
            </div>
            {webhook.last_delivered_at && (
              <Alert tone={webhook.last_error ? "warning" : "success"} title={webhook.last_error ? "Last delivery failed" : "Last delivery succeeded"}>
                {webhook.last_error ?? `Your endpoint responded with ${webhook.last_status}.`} {formatDateTime(webhook.last_delivered_at)}
              </Alert>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap justify-end gap-2">
        {webhook && (
          <>
            <Button variant="ghost" className="text-rose-500" disabled={pending} onClick={() => run(deleteWebhook, "Webhook removed.")}>
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                if (confirm("Rotate the signing secret? Your endpoint must use the new secret straight away.")) run(rotateWebhookSecret, "New secret created.");
              }}
            >
              <RefreshCw className="h-4 w-4" /> Rotate secret
            </Button>
            <Button variant="outline" disabled={pending} onClick={() => run(sendTestWebhook, "Test event delivered.")}>
              <Send className="h-4 w-4" /> Send test
            </Button>
          </>
        )}
        <Button loading={pending} onClick={() => run(() => saveWebhook(url, enabled), "Webhook saved.")}>
          Save webhook
        </Button>
      </CardFooter>
    </Card>
  );
}
