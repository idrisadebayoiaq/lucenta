"use client";

import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { Eraser, Lightbulb, PartyPopper, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { DailyTextsLeft } from "@/components/detection-report";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/misc";
import { MAX_TEXT_CHARS } from "@/lib/limits";
import { SUGGESTION_CATEGORIES, type SuggestionResult } from "@/lib/suggestions/types";
import { cn, countWords } from "@/lib/utils";

/** The analysed text with each flagged sentence highlighted and numbered. */
function AnnotatedText({ text, result, active, onSelect }: { text: string; result: SuggestionResult; active: number | null; onSelect: (i: number) => void }) {
  const marks = useMemo(() => {
    const byStart = new Map<number, { start: number; end: number; numbers: number[] }>();
    result.suggestions.forEach((s, i) => {
      const mark = byStart.get(s.start) ?? { start: s.start, end: s.end, numbers: [] };
      mark.numbers.push(i);
      byStart.set(s.start, mark);
    });
    return [...byStart.values()].sort((a, b) => a.start - b.start);
  }, [result]);

  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const mark of marks) {
    if (mark.start < cursor) continue;
    parts.push(<Fragment key={`t${cursor}`}>{text.slice(cursor, mark.start)}</Fragment>);
    const isActive = active !== null && mark.numbers.includes(active);
    parts.push(
      <mark
        key={`m${mark.start}`}
        onClick={() => onSelect(mark.numbers[0])}
        className={cn(
          "cursor-pointer rounded bg-amber-400/25 text-inherit transition-colors hover:bg-amber-400/40",
          isActive && "bg-amber-400/50 ring-2 ring-amber-500",
        )}
      >
        {text.slice(mark.start, mark.end)}
        {mark.numbers.map((n) => (
          <sup key={n} className="ml-0.5 font-bold text-amber-600 dark:text-amber-400">
            {n + 1}
          </sup>
        ))}
      </mark>,
    );
    cursor = mark.end;
  }
  parts.push(<Fragment key="end">{text.slice(cursor)}</Fragment>);

  return <div className="min-h-96 flex-1 whitespace-pre-wrap rounded-xl border bg-muted/30 p-3 text-sm leading-7">{parts}</div>;
}

export function SuggestionsTool({
  text,
  setText,
  usage,
  isStudent,
}: {
  text: string;
  setText: (text: string) => void;
  usage: { used: number; limit: number };
  isStudent: boolean;
}) {
  const router = useRouter();
  const [result, setResult] = useState<SuggestionResult | null>(null);
  const [analyzedText, setAnalyzedText] = useState("");
  const [editing, setEditing] = useState(true);
  const [active, setActive] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const words = countWords(text);
  const chars = text.trim().length;
  const edited = !!result && text !== analyzedText;

  async function onSuggest() {
    setLoading(true);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error?.message ?? "Couldn't get suggestions.");
      else {
        setResult(data);
        setAnalyzedText(text);
        setEditing(false);
        setActive(null);
        router.refresh();
      }
    } catch {
      toast.error("Network error. Please try again.");
    }
    setLoading(false);
  }

  function select(i: number) {
    setActive(i);
    document.getElementById(`suggestion-${i}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const showAnnotated = result && !editing;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="flex flex-col">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Your text</CardTitle>
          {showAnnotated ? (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> Edit text
            </Button>
          ) : (
            <span className={cn("text-sm text-muted-foreground", chars > MAX_TEXT_CHARS && "text-rose-500")}>
              {chars.toLocaleString()} / {MAX_TEXT_CHARS.toLocaleString()} characters
            </span>
          )}
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          {showAnnotated ? (
            <AnnotatedText text={analyzedText} result={result} active={active} onSelect={select} />
          ) : (
            <Textarea
              value={text}
              maxLength={MAX_TEXT_CHARS}
              onChange={(e) => setText(e.target.value)}
              placeholder={isStudent ? "Paste your draft here to see what could be clearer…" : "Paste your writing here to see what could be clearer…"}
              className="min-h-96 flex-1 text-sm leading-7"
            />
          )}
          {edited && (
            <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              You&apos;ve edited your text since these suggestions. Check again to see what&apos;s improved (uses one daily text).
            </p>
          )}
          <div className="flex justify-between gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setText("");
                setEditing(true);
              }}
              disabled={!text}
            >
              <Eraser className="h-4 w-4" /> Clear
            </Button>
            <Button onClick={onSuggest} loading={loading} disabled={words < 20 || chars > MAX_TEXT_CHARS || (!!result && !edited)}>
              {!loading && (result ? <RefreshCw className="h-4 w-4" /> : <Lightbulb className="h-4 w-4" />)}
              {loading ? "Reading your text…" : result ? "Check again" : "Get suggestions"}
            </Button>
          </div>
          <DailyTextsLeft used={usage.used} limit={usage.limit} />
        </CardContent>
      </Card>

      <Card className="flex flex-col">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Suggestions</CardTitle>
          {result && result.suggestions.length > 0 && <Badge tone="outline">{result.suggestions.length} to review</Badge>}
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4">
          {!result ? (
            <div className="flex min-h-96 flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              <Lightbulb className="h-8 w-8 text-primary" />
              <p className="max-w-sm">
                Lucenta points out sentences that sound robotic, unclear or wordy and explains how to fix them. You make the
                changes yourself, so the writing sounds like you.
              </p>
            </div>
          ) : (
            <>
              {result.summary.length > 0 && (
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="mb-1.5 text-sm font-bold">Overall</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {result.summary.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.suggestions.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  <PartyPopper className="h-8 w-8 text-primary" />
                  Nice work. We didn&apos;t find anything that needs fixing.
                </div>
              ) : (
                <ol className="max-h-[36rem] space-y-3 overflow-y-auto pr-1">
                  {result.suggestions.map((s, i) => (
                    <li
                      key={`${s.start}-${s.category}`}
                      id={`suggestion-${i}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => {
                        setActive(i);
                        setEditing(false);
                      }}
                      className={cn(
                        "cursor-pointer space-y-2 rounded-xl border p-3 transition-colors",
                        active === i ? "border-amber-500 bg-amber-400/5" : "hover:bg-muted/50",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-400/25 text-xs font-bold text-amber-700 dark:text-amber-300">
                          {i + 1}
                        </span>
                        <Badge tone="outline">{SUGGESTION_CATEGORIES[s.category]}</Badge>
                      </div>
                      <blockquote className="line-clamp-2 border-l-2 pl-3 text-sm italic text-muted-foreground">{s.sentence}</blockquote>
                      <p className="text-sm">{s.issue}</p>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-bold text-foreground">How to fix: </span>
                        {s.tip}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
