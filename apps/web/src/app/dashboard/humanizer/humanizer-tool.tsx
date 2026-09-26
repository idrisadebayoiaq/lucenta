"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bot, Check, Copy, Eraser, RefreshCw, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { AiGauge, LABELS } from "@/components/ai-gauge";
import { DailyTextsLeft, DetectionReasons, HighlightedText } from "@/components/detection-report";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Alert, Badge } from "@/components/ui/misc";
import type { DetectionResult } from "@/lib/detector/types";
import { STRENGTHS, TONES, type Strength, type Tone } from "@/lib/humanizer/options";
import { MAX_TEXT_CHARS } from "@/lib/limits";
import { cn, countWords } from "@/lib/utils";

type Result = { text: string; aiScoreBefore: number; aiScoreAfter: number; similarity: number; iterations: number };

function wordDiff(a: string, b: string) {
  const A = a.split(/(\s+)/);
  const B = b.split(/(\s+)/);
  const setA = new Set(A.map((w) => w.toLowerCase()));
  return B.map((w, i) => ({ w, changed: w.trim() !== "" && !setA.has(w.toLowerCase()), key: i }));
}

export function HumanizerTool({ usage, configured }: { usage: { used: number; limit: number }; configured: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [tone, setTone] = useState<Tone>("standard");
  const [strength, setStrength] = useState<Strength>("balanced");
  const [keepWords, setKeepWords] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [check, setCheck] = useState<DetectionResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [copied, setCopied] = useState(false);
  const words = countWords(text);
  const chars = text.trim().length;

  useEffect(() => {
    const incoming = sessionStorage.getItem("humanizer:text");
    if (incoming) {
      // sessionStorage is only readable after hydration, so this can't be a lazy initial state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setText(incoming);
      sessionStorage.removeItem("humanizer:text");
    }
  }, []);

  const diff = useMemo(() => (result ? wordDiff(text, result.text) : []), [result, text]);

  async function onHumanize() {
    setLoading(true);
    try {
      const res = await fetch("/api/humanize", {
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
      if (!res.ok) toast.error(data.error?.message ?? "Humanizing failed.");
      else {
        setResult(data);
        setCheck(null);
        setShowHighlights(false);
        router.refresh();
      }
    } catch {
      toast.error("Network error. Please try again.");
    }
    setLoading(false);
  }

  async function onCheck() {
    if (!result) return;
    setChecking(true);
    try {
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: result.text, save: false }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error?.message ?? "Checking failed.");
      else setCheck(data);
    } catch {
      toast.error("Network error. Please try again.");
    }
    setChecking(false);
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
        <Alert tone="warning" title="Humanizer engine not connected yet">
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
            <Label>Strength</Label>
            <div className="grid grid-cols-3 gap-1 rounded-full border p-1">
              {STRENGTHS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStrength(s.id)}
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
            <CardTitle>Original</CardTitle>
            <span className={cn("text-sm text-muted-foreground", chars > MAX_TEXT_CHARS && "text-rose-500")}>
              {chars.toLocaleString()} / {MAX_TEXT_CHARS.toLocaleString()} characters
            </span>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            <Textarea
              value={text}
              maxLength={MAX_TEXT_CHARS}
              onChange={(e) => {
                setText(e.target.value);
                setResult(null);
                setCheck(null);
              }}
              placeholder="Paste AI-sounding text here…"
              className="min-h-96 flex-1 text-sm leading-7"
            />
            <div className="flex justify-between gap-2">
              <Button variant="ghost" onClick={() => setText("")} disabled={!text}>
                <Eraser className="h-4 w-4" /> Clear
              </Button>
              <Button onClick={onHumanize} loading={loading} disabled={words < 20 || chars > MAX_TEXT_CHARS || !configured}>
                <Wand2 className="h-4 w-4" /> {loading ? "Humanizing…" : "Humanize"}
              </Button>
            </div>
            <DailyTextsLeft used={usage.used} limit={usage.limit} />
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Humanized</CardTitle>
            {result && (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setShowDiff((d) => !d)}>
                  {showDiff ? "Hide changes" : "Show changes"}
                </Button>
                <Button variant="ghost" size="sm" onClick={onHumanize} loading={loading}>
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
                {check && showHighlights ? (
                  <HighlightedText text={result.text} result={check} className="min-h-96 flex-1 rounded-xl border bg-muted/30 p-3 text-sm leading-7" />
                ) : (
                  <div className="min-h-96 flex-1 whitespace-pre-wrap rounded-xl border bg-muted/30 p-3 text-sm leading-7">
                    {showDiff
                      ? diff.map((d) => (
                          <span key={d.key} className={d.changed ? "rounded bg-emerald-500/20" : undefined}>
                            {d.w}
                          </span>
                        ))
                      : result.text}
                  </div>
                )}
                <div className="grid grid-cols-3 items-center gap-2 rounded-xl border p-3">
                  <AiGauge probability={result.aiScoreBefore} size={100} caption="Original" />
                  <ArrowRight className="mx-auto h-5 w-5 text-muted-foreground" />
                  {check ? (
                    <AiGauge probability={check.aiProbability} size={100} caption="Humanized" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center">
                      <Button size="sm" onClick={onCheck} loading={checking}>
                        {!checking && <Bot className="h-4 w-4" />} Check AI score
                      </Button>
                      <span className="text-xs text-muted-foreground">Free — doesn&apos;t use a daily text</span>
                    </div>
                  )}
                </div>
                {check && (
                  <div className="space-y-3 rounded-xl border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge tone={LABELS[check.label].tone}>{LABELS[check.label].text}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => setShowHighlights((s) => !s)}>
                        {showHighlights ? "Hide sentence highlights" : "Highlight sentences"}
                      </Button>
                    </div>
                    <DetectionReasons result={check} />
                  </div>
                )}
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge tone={result.similarity >= 0.75 ? "success" : "warning"}>Meaning kept: {Math.round(result.similarity * 100)}%</Badge>
                  <Badge tone="outline">{countWords(result.text)} words</Badge>
                  <Badge tone="outline">{result.iterations} pass{result.iterations > 1 ? "es" : ""}</Badge>
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
