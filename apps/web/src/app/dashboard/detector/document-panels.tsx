"use client";

import { FileText, X } from "lucide-react";
import { LABELS } from "@/components/ai-gauge";
import { Alert, Badge } from "@/components/ui/misc";
import type { DocumentInfo } from "@/lib/detector/types";
import { MAX_DOCUMENT_CHARS, type TextRange } from "@/lib/documents/split";
import { cn } from "@/lib/utils";

export type UploadedDocument = { fileName: string; text: string; words: number; truncated: boolean; totalParts: number };

const barColor = (p: number) => (p >= 0.7 ? "bg-rose-500" : p > 0.3 ? "bg-amber-500" : "bg-emerald-500");

export function DocumentPreview({
  doc,
  ranges,
  left,
  onRemove,
}: {
  doc: UploadedDocument;
  ranges: TextRange[];
  left: number;
  onRemove: () => void;
}) {
  const needed = ranges.length;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 border-2 border-ink bg-muted/40 p-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{doc.fileName}</p>
          <p className="text-xs text-muted-foreground">
            {doc.words.toLocaleString()} words · {doc.text.length.toLocaleString()} characters · {needed} {needed === 1 ? "part" : "parts"}
          </p>
        </div>
        <button type="button" onClick={onRemove} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Remove file">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-80 min-h-60 space-y-4 overflow-y-auto border-2 border-ink bg-card p-3">
        {ranges.map((r, i) => (
          <div key={r.start} className={cn(i >= left && "opacity-50")}>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">
              Part {i + 1} · {(r.end - r.start).toLocaleString()} characters
            </p>
            <p className="whitespace-pre-wrap text-sm leading-7">{doc.text.slice(r.start, r.end)}</p>
          </div>
        ))}
      </div>

      {doc.truncated && (
        <Alert tone="warning" title="Long document">
          This file would need {doc.totalParts} parts. Only the first {ranges.length} (about {MAX_DOCUMENT_CHARS.toLocaleString()} characters) are shown, the most
          you can check in a day.
        </Alert>
      )}
      <p className={cn("text-xs", needed > left ? "text-rose-500" : "text-muted-foreground")}>
        Long documents are checked in parts of up to 3,000 characters. Each part uses 1 daily text.{" "}
        {left === 0
          ? "You have no texts left today."
          : needed > left
            ? `This one needs ${needed}, and you have ${left} left today, so you can check the first ${left}.`
            : `This one uses ${needed} of your ${left} left today.`}
      </p>
    </div>
  );
}

export function DocumentPartsCard({ document, onSelect }: { document: DocumentInfo; onSelect?: (index: number) => void }) {
  return (
    <div className="space-y-3">
      {document.parts.map((p, i) => (
        <button
          key={p.start}
          type="button"
          onClick={() => onSelect?.(i)}
          disabled={!onSelect}
          className={cn("w-full space-y-1.5 border-2 border-ink p-3 text-left transition-colors", onSelect && "cursor-pointer hover:bg-muted/50")}
        >
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-semibold">Part {i + 1}</span>
            <span className="text-xs text-muted-foreground">{p.wordCount} words</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", barColor(p.aiProbability))} style={{ width: `${Math.max(2, Math.round(p.aiProbability * 100))}%` }} />
            </div>
            <span className="w-10 text-right text-sm font-semibold">{Math.round(p.aiProbability * 100)}%</span>
          </div>
          <Badge tone={LABELS[p.label].tone}>{LABELS[p.label].text}</Badge>
        </button>
      ))}
      {document.totalParts > document.parts.length && (
        <p className="text-xs text-muted-foreground">
          The first {document.parts.length} of {document.totalParts} parts were checked.
        </p>
      )}
    </div>
  );
}
