import type { ReactNode } from "react";
import type { DetectionResult } from "@/lib/detector/types";
import { cn } from "@/lib/utils";

function highlightClass(ai: number) {
  if (ai >= 0.7) return "bg-rose-500/20";
  if (ai >= 0.4) return "bg-amber-500/20";
  return "";
}

export function HighlightedText({ text, result, className }: { text: string; result: DetectionResult; className?: string }) {
  if (!result.sentences.length) return <div className={className}>{text}</div>;
  const parts: ReactNode[] = [];
  let cursor = 0;
  result.sentences.forEach((s, i) => {
    if (s.start > cursor) parts.push(text.slice(cursor, s.start));
    parts.push(
      <span key={i} className={cn("rounded px-0.5", highlightClass(s.ai))} title={`${Math.round(s.ai * 100)}% AI`}>
        {text.slice(s.start, s.end)}
      </span>,
    );
    cursor = s.end;
  });
  parts.push(text.slice(cursor));
  return <div className={cn("whitespace-pre-wrap", className)}>{parts}</div>;
}

export function DetectionReasons({ result }: { result: DetectionResult }) {
  return (
    <div className="space-y-4 text-sm">
      <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
        {result.explanation.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-2">
        {[
          ["Burstiness", result.signals.burstiness],
          ["Avg. sentence", `${result.signals.avgSentenceLength} words`],
          ["Lexical diversity", result.signals.lexicalDiversity],
          ["AI phrases", result.signals.aiPhraseCount],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border p-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-rose-500/30" /> Likely AI
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-amber-500/30" /> Possibly AI
        </span>
      </div>
    </div>
  );
}

export function DailyTextsLeft({ used, limit }: { used: number; limit: number }) {
  const left = Math.max(0, limit - used);
  return (
    <p className={cn("text-xs", left === 0 ? "text-rose-500" : "text-muted-foreground")}>
      {left === 0
        ? "Daily limit reached · you can still re-check or rewrite today's texts"
        : `${left} of ${limit} new texts left today`}
    </p>
  );
}
