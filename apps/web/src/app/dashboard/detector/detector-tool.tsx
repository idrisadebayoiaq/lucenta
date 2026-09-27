"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bot, Eraser, Lightbulb, Upload } from "lucide-react";
import { toast } from "sonner";
import { AiGauge, LABELS } from "@/components/ai-gauge";
import { DailyTextsLeft, DetectionReasons, HighlightedText } from "@/components/detection-report";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Alert, Badge, EmptyState } from "@/components/ui/misc";
import { WriterSuggestions } from "@/components/writer-suggestions";
import { MIN_DETECT_WORDS, type DetectionResult } from "@/lib/detector/types";
import type { Freelancer } from "@/lib/freelancers";
import { MAX_TEXT_CHARS } from "@/lib/limits";
import { cn, countWords } from "@/lib/utils";
import { REWRITER_HANDOFF_KEY } from "../rewriter/rewriter-workspace";

export function DetectorTool({ usage, writers }: { usage: { used: number; limit: number }; writers: Freelancer[] | null }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [analyzedText, setAnalyzedText] = useState("");
  const [loading, setLoading] = useState(false);
  const words = countWords(text);
  const chars = text.trim().length;

  async function onDetect() {
    setLoading(true);
    try {
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message ?? "Detection failed.");
      } else {
        setResult(data);
        setAnalyzedText(text.trim());
        router.refresh();
      }
    } catch {
      toast.error("Network error. Please try again.");
    }
    setLoading(false);
  }

  async function onFile(file: File) {
    if (!/\.(txt|md)$/i.test(file.name)) return toast.error("Only .txt and .md files are supported for now.");
    if (file.size > 1024 * 1024) return toast.error("File must be 1 MB or smaller.");
    const content = await file.text();
    if (content.trim().length > MAX_TEXT_CHARS) toast.warning(`Only the first ${MAX_TEXT_CHARS.toLocaleString()} characters were kept.`);
    setText(content.slice(0, MAX_TEXT_CHARS));
    setResult(null);
  }

  function getSuggestions() {
    sessionStorage.setItem(REWRITER_HANDOFF_KEY, analyzedText || text);
    router.push("/dashboard/rewriter?mode=suggest");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <Card>
        <CardContent className="space-y-3 pt-6">
          {result ? (
            <HighlightedText text={analyzedText} result={result} className="min-h-80 rounded-xl border bg-card p-3 text-sm leading-7" />
          ) : (
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX_TEXT_CHARS}
              placeholder={`Paste the text you want to check (at least ${MIN_DETECT_WORDS} words, up to ${MAX_TEXT_CHARS.toLocaleString()} characters)…`}
              className="min-h-80 text-sm leading-7"
            />
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className={cn(chars > MAX_TEXT_CHARS && "text-rose-500")}>
                {chars.toLocaleString()} / {MAX_TEXT_CHARS.toLocaleString()} characters
              </span>
              {!result && (
                <label className="inline-flex cursor-pointer items-center gap-1 hover:text-foreground">
                  <Upload className="h-4 w-4" /> Upload .txt
                  <input type="file" accept=".txt,.md,text/plain" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
                </label>
              )}
            </div>
            <div className="flex gap-2">
              {result ? (
                <Button variant="outline" onClick={() => setResult(null)}>
                  Edit text
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => setText("")} disabled={!text}>
                  <Eraser className="h-4 w-4" /> Clear
                </Button>
              )}
              <Button onClick={onDetect} loading={loading} disabled={words < MIN_DETECT_WORDS || chars > MAX_TEXT_CHARS || !!result}>
                <Bot className="h-4 w-4" /> Detect AI
              </Button>
            </div>
          </div>
          {words > 0 && words < MIN_DETECT_WORDS && !result && (
            <p className="text-xs text-muted-foreground">Add {MIN_DETECT_WORDS - words} more words for a reliable result.</p>
          )}
          <DailyTextsLeft used={usage.used} limit={usage.limit} />
        </CardContent>
      </Card>

      <div className="space-y-6">
        {result ? (
          <>
            <Card>
              <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
                <AiGauge probability={result.aiProbability} caption="AI probability" />
                <Badge tone={LABELS[result.label].tone} className="text-sm">
                  {LABELS[result.label].text}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Confidence: <span className="font-medium capitalize text-foreground">{result.confidence}</span> · {result.wordCount} words
                </p>
                <Button variant="outline" className="w-full" onClick={getSuggestions}>
                  <Lightbulb className="h-4 w-4" /> Get writing suggestions
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Why this score?</CardTitle>
              </CardHeader>
              <CardContent>
                <DetectionReasons result={result} />
              </CardContent>
            </Card>
            {writers && <WriterSuggestions key={analyzedText} text={analyzedText} writers={writers} />}
            {result.engine === "heuristic" && (
              <Alert tone="info" title="Preview detector">
                This result comes from the built-in statistical detector. The trained ML detector will be more accurate once it&apos;s connected.
              </Alert>
            )}
          </>
        ) : (
          <EmptyState
            icon={<Bot className="h-8 w-8" />}
            title="Paste text to begin"
            description="You'll see the AI probability, highlighted sentences and the reasons behind the score."
          />
        )}
      </div>
    </div>
  );
}
