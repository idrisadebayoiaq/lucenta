"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Bot, Download, Eraser, FileText, Lightbulb, Upload } from "lucide-react";
import { toast } from "sonner";
import { AiGauge, LABELS } from "@/components/ai-gauge";
import { DailyTextsLeft, DetectionReasons, HighlightedText } from "@/components/detection-report";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Alert, Badge, EmptyState } from "@/components/ui/misc";
import { WriterSuggestions } from "@/components/writer-suggestions";
import { MIN_DETECT_WORDS, type DetectionResult } from "@/lib/detector/types";
import { DOCUMENT_TYPES, MAX_DOCUMENT_BYTES, splitDocument } from "@/lib/documents/split";
import type { Freelancer } from "@/lib/freelancers";
import { MAX_TEXT_CHARS } from "@/lib/limits";
import { cn, countWords } from "@/lib/utils";
import { REWRITER_HANDOFF_KEY } from "../rewriter/rewriter-workspace";
import { DocumentPartsCard, DocumentPreview, type UploadedDocument } from "./document-panels";

type CheckResult = DetectionResult & { checkId: string | null };

export function DetectorTool({ usage, writers }: { usage: { used: number; limit: number }; writers: Freelancer[] | null }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [doc, setDoc] = useState<UploadedDocument | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [analyzedText, setAnalyzedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const words = countWords(text);
  const chars = text.trim().length;
  const left = Math.max(0, usage.limit - usage.used);
  const ranges = useMemo(() => (doc ? splitDocument(doc.text) : []), [doc]);

  async function check(url: string, body: object, checkedText: (data: CheckResult & { text?: string }) => string) {
    setLoading(true);
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message ?? "Detection failed.");
      } else {
        setResult(data);
        setAnalyzedText(checkedText(data));
        router.refresh();
      }
    } catch {
      toast.error("Network error. Please try again.");
    }
    setLoading(false);
  }

  const onDetect = () => check("/api/detect", { text, title: fileName ?? undefined }, () => text.trim());
  const onDetectDocument = (parts: number) =>
    doc && check("/api/detect/document", { fileName: doc.fileName, text: doc.text, parts, totalParts: doc.totalParts }, (d) => d.text ?? doc.text);

  async function onFile(file: File) {
    if (fileInput.current) fileInput.current.value = "";
    const ext = /\.[a-z0-9]+$/i.exec(file.name)?.[0].toLowerCase() ?? "";
    if (!DOCUMENT_TYPES.includes(ext)) return toast.error(`Upload a ${DOCUMENT_TYPES.join(", ")} file.`);
    if (file.size > MAX_DOCUMENT_BYTES) return toast.error(`Files can be up to ${MAX_DOCUMENT_BYTES / 1024 / 1024} MB.`);

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/documents/extract", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message ?? "We couldn't read this file.");
      } else if (data.text.length <= MAX_TEXT_CHARS && !data.truncated) {
        setText(data.text);
        setFileName(data.fileName);
        setDoc(null);
        setResult(null);
      } else {
        setDoc(data);
        setResult(null);
      }
    } catch {
      toast.error("Upload failed. Please try again.");
    }
    setUploading(false);
  }

  function reset() {
    setText("");
    setFileName(null);
    setDoc(null);
    setResult(null);
  }

  const parts = result?.document?.parts;
  const topPart = parts?.length ? parts.reduce((best, p, i) => (p.aiProbability > parts[best].aiProbability ? i : best), 0) : null;

  function getSuggestions() {
    const handoff = parts && topPart != null ? analyzedText.slice(parts[topPart].start, parts[topPart].end) : analyzedText || text;
    sessionStorage.setItem(REWRITER_HANDOFF_KEY, handoff);
    router.push("/dashboard/rewriter?mode=suggest");
  }

  function scrollToPart(index: number) {
    resultRef.current?.querySelector(`[data-part="${index}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const docParts = Math.min(ranges.length, left);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <Card>
        <CardContent className="space-y-3 pt-6">
          {result ? (
            <div ref={resultRef} className={cn("max-h-[36rem] min-h-80 overflow-y-auto border-2 border-ink bg-card p-3 text-sm leading-7", parts && "space-y-4")}>
              {parts ? (
                parts.map((p, i) => (
                  <div key={p.start} data-part={i} className="scroll-mt-3">
                    <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      Part {i + 1} <Badge tone={LABELS[p.label].tone}>{Math.round(p.aiProbability * 100)}% AI</Badge>
                    </p>
                    <HighlightedText
                      text={analyzedText.slice(0, p.end)}
                      result={{ ...result, sentences: result.sentences.filter((s) => s.start >= p.start && s.end <= p.end) }}
                      start={p.start}
                    />
                  </div>
                ))
              ) : (
                <HighlightedText text={analyzedText} result={result} />
              )}
            </div>
          ) : doc ? (
            <DocumentPreview doc={doc} ranges={ranges} left={left} onRemove={reset} />
          ) : (
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX_TEXT_CHARS}
              placeholder={`Paste the text you want to check (at least ${MIN_DETECT_WORDS} words, up to ${MAX_TEXT_CHARS.toLocaleString()} characters), or upload a document…`}
              className="min-h-80 text-sm leading-7"
            />
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {!doc && !result?.document && (
                <span className={cn(chars > MAX_TEXT_CHARS && "text-rose-500")}>
                  {chars.toLocaleString()} / {MAX_TEXT_CHARS.toLocaleString()} characters
                </span>
              )}
              {fileName && !doc && (
                <span className="inline-flex max-w-48 items-center gap-1 truncate">
                  <FileText className="h-4 w-4 shrink-0" /> <span className="truncate">{fileName}</span>
                </span>
              )}
              {!result && (
                <label className={cn("inline-flex cursor-pointer items-center gap-1 hover:text-foreground", uploading && "pointer-events-none opacity-60")}>
                  <Upload className="h-4 w-4" /> {uploading ? "Reading file…" : doc ? "Upload another" : "Upload document"}
                  <input
                    ref={fileInput}
                    type="file"
                    accept={DOCUMENT_TYPES.join(",")}
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
                  />
                </label>
              )}
            </div>
            <div className="flex gap-2">
              {result ? (
                <Button variant="outline" onClick={() => setResult(null)}>
                  {doc ? "Back to document" : "Edit text"}
                </Button>
              ) : (
                <Button variant="ghost" onClick={reset} disabled={!text && !doc}>
                  <Eraser className="h-4 w-4" /> Clear
                </Button>
              )}
              {doc ? (
                !result && (
                  <Button onClick={() => onDetectDocument(docParts)} loading={loading} disabled={docParts === 0}>
                    <Bot className="h-4 w-4" />
                    {docParts < ranges.length ? `Check first ${docParts} ${docParts === 1 ? "part" : "parts"}` : "Check document"}
                  </Button>
                )
              ) : (
                <Button onClick={onDetect} loading={loading} disabled={words < MIN_DETECT_WORDS || chars > MAX_TEXT_CHARS || !!result}>
                  <Bot className="h-4 w-4" /> Detect AI
                </Button>
              )}
            </div>
          </div>
          {!doc && words > 0 && words < MIN_DETECT_WORDS && !result && (
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
                <AiGauge probability={result.aiProbability} caption={result.document ? "AI probability, whole document" : "AI probability"} />
                <Badge tone={LABELS[result.label].tone} className="text-sm">
                  {LABELS[result.label].text}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Confidence: <span className="font-medium capitalize text-foreground">{result.confidence}</span> · {result.wordCount.toLocaleString()} words
                  {parts && ` · ${parts.length} parts`}
                </p>
                {result.checkId ? (
                  <a href={`/api/text-checks/${result.checkId}/pdf`} className={buttonVariants({ className: "w-full" })}>
                    <Download className="h-4 w-4" /> Download PDF report
                  </a>
                ) : (
                  <p className="text-xs text-muted-foreground">Turn on history in Settings to download PDF reports.</p>
                )}
                <Button variant="outline" className="w-full" onClick={getSuggestions}>
                  <Lightbulb className="h-4 w-4" /> {topPart != null ? `Get suggestions for part ${topPart + 1}` : "Get writing suggestions"}
                </Button>
              </CardContent>
            </Card>
            {result.document && (
              <Card>
                <CardHeader>
                  <CardTitle>Parts</CardTitle>
                </CardHeader>
                <CardContent>
                  <DocumentPartsCard document={result.document} onSelect={scrollToPart} />
                </CardContent>
              </Card>
            )}
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
            title="Paste text or upload a document"
            description="Upload a .docx, .pdf or .txt file, or paste text. You'll see the AI probability, highlighted sentences and the reasons behind the score."
          />
        )}
      </div>
    </div>
  );
}
