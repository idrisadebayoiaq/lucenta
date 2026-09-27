"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, Copy, Eraser, RefreshCw, ShieldCheck, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { DailyTextsLeft } from "@/components/detection-report";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Alert, Badge } from "@/components/ui/misc";
import { STRENGTHS, TONES, type Strength, type Tone } from "@/lib/humanizer/options";
import { MAX_TEXT_CHARS } from "@/lib/limits";
import { cn, countWords } from "@/lib/utils";

type Result = { text: string; similarity: number; iterations: number };

function wordDiff(a: string, b: string) {
  const A = a.split(/(\s+)/);
  const B = b.split(/(\s+)/);
  const setA = new Set(A.map((w) => w.toLowerCase()));
  return B.map((w, i) => ({ w, changed: w.trim() !== "" && !setA.has(w.toLowerCase()), key: i }));
}

export function RewriteTool({
  text,
  setText,
  usage,
  configured,
}: {
  text: string;
  setText: (text: string) => void;
  usage: { used: number; limit: number };
  configured: boolean;
}) {
  const router = useRouter();
  const [tone, setTone] = useState<Tone>("standard");
  const [strength, setStrength] = useState<Strength>("balanced");
  const [keepWords, setKeepWords] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [rewrittenFrom, setRewrittenFrom] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [copied, setCopied] = useState(false);
  const words = countWords(text);
  const chars = text.trim().length;

  const diff = useMemo(() => (result ? wordDiff(rewrittenFrom, result.text) : []), [result, rewrittenFrom]);

  async function onRewrite() {
    setLoading(true);
    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text,
          tone,
          strength,
          keepWords: keepWords.split(",").map((w) => w.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error?.message ?? "Rewriting failed.");
      else {
        setResult(data);
        setRewrittenFrom(text);
        router.refresh();
      }
    } catch {
      toast.error("Network error. Please try again.");
    }
    setLoading(false);
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.text);
    setCopied(true);
    toast.success("Copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {!configured && (
        <Alert tone="warning" title="Rewriting engine not connected yet">
          The interface is ready. Add <code className="font-mono">OPENROUTER_API_KEY</code> (or <code className="font-mono">OPENAI_API_KEY</code>) to{" "}
          <code className="font-mono">.env</code> and restart the server to start rewriting text.
        </Alert>
      )}

      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-[1fr_1fr_1fr]">
          <div className="space-y-2">
            <Label>Tone</Label>
            <div className="flex flex-wrap gap-1.5">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTone(t.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm font-medium cursor-pointer",
                    tone === t.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>How much to change</Label>
            <div className="grid grid-cols-3 gap-1 rounded-full border p-1">
              {STRENGTHS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStrength(s.id)}
                  title={s.description}
                  className={cn(
                    "rounded-full px-2 py-1.5 text-sm font-medium cursor-pointer",
                    strength === s.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="keep">Keep these words (comma-separated)</Label>
            <Input id="keep" value={keepWords} onChange={(e) => setKeepWords(e.target.value)} placeholder="e.g. Lucenta, SEO" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Your text</CardTitle>
            <span className={cn("text-sm text-muted-foreground", chars > MAX_TEXT_CHARS && "text-rose-500")}>
              {chars.toLocaleString()} / {MAX_TEXT_CHARS.toLocaleString()} characters
            </span>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            <Textarea
              value={text}
              maxLength={MAX_TEXT_CHARS}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste writing you'd like to make clearer, warmer or more natural…"
              className="min-h-96 flex-1 text-sm leading-7"
            />
            <div className="flex justify-between gap-2">
              <Button variant="ghost" onClick={() => setText("")} disabled={!text}>
                <Eraser className="h-4 w-4" /> Clear
              </Button>
              <Button onClick={onRewrite} loading={loading} disabled={words < 20 || chars > MAX_TEXT_CHARS || !configured}>
                <Wand2 className="h-4 w-4" /> {loading ? "Rewriting…" : "Rewrite"}
              </Button>
            </div>
            <DailyTextsLeft used={usage.used} limit={usage.limit} />
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Rewritten</CardTitle>
            {result && (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setShowDiff((d) => !d)}>
                  {showDiff ? "Hide changes" : "Show changes"}
                </Button>
                <Button variant="ghost" size="sm" onClick={onRewrite} loading={loading}>
                  {!loading && <RefreshCw className="h-4 w-4" />} Again
                </Button>
                <Button variant="outline" size="sm" onClick={copy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            {result ? (
              <>
                <div className="min-h-96 flex-1 whitespace-pre-wrap rounded-xl border bg-muted/30 p-3 text-sm leading-7">
                  {showDiff
                    ? diff.map((d) => (
                        <span key={d.key} className={d.changed ? "rounded bg-emerald-500/20" : undefined}>
                          {d.w}
                        </span>
                      ))
                    : result.text}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge tone={result.similarity >= 0.75 ? "success" : "warning"}>Meaning kept: {Math.round(result.similarity * 100)}%</Badge>
                  <Badge tone="outline">{countWords(result.text)} words</Badge>
                  <Badge tone="outline">
                    {result.iterations} pass{result.iterations > 1 ? "es" : ""}
                  </Badge>
                </div>
                <div className="flex items-start gap-3 rounded-xl border px-3 py-2.5 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>
                    You&apos;re the author of anything you use. Read this through before using it, and disclose AI assistance
                    wherever your school, employer, client or publisher requires it.{" "}
                    <Link href="/responsible-use" className="font-bold text-primary hover:underline">
                      Responsible use
                    </Link>
                  </p>
                </div>
              </>
            ) : (
              <div className="flex min-h-96 flex-1 items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Your rewritten text will appear here.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
