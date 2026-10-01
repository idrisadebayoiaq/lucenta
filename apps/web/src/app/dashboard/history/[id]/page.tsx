import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AiGauge, LABELS } from "@/components/ai-gauge";
import { HighlightedText } from "@/components/detection-report";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import type { DetectionResult } from "@/lib/detector/types";
import { STRENGTHS } from "@/lib/humanizer/options";
import { SUGGESTION_CATEGORIES, type SuggestionResult } from "@/lib/suggestions/types";
import { createClient } from "@/lib/supabase/server";
import { textCheckLabel } from "@/lib/text-checks";
import { formatDateTime } from "@/lib/utils";
import { DocumentPartsCard } from "../../detector/document-panels";
import { EditableTitle, TextCheckActions } from "./text-check-actions";

export const metadata: Metadata = { title: "Text check" };

export default async function TextCheckPage({ params }: PageProps<"/dashboard/history/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: check } = await supabase.from("text_checks").select("*").eq("id", id).maybeSingle();
  if (!check) notFound();

  const isRewrite = check.kind === "humanize";
  const isSuggest = check.kind === "suggest";
  const detection = check.kind === "detect" ? (check.result as DetectionResult | null) : null;
  const suggestions = isSuggest ? (check.result as SuggestionResult | null) : null;
  const strengthLabel = STRENGTHS.find((s) => s.id === check.strength)?.label;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/history?tab=texts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> History
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <EditableTitle id={check.id} title={check.title || "Untitled text"} />
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge>{textCheckLabel(check.kind)}</Badge>
            {detection?.document && <Badge tone="outline">Document · {detection.document.parts.length} parts</Badge>}
            {check.word_count} words · {formatDateTime(check.created_at)}
            {check.tone && <Badge tone="outline" className="capitalize">{check.tone}</Badge>}
            {strengthLabel && <Badge tone="outline">{strengthLabel}</Badge>}
          </p>
        </div>
        <TextCheckActions id={check.id} output={check.output_text} pdf={!!detection && !!check.input_text} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{isRewrite ? "Original" : "Text"}</CardTitle>
            </CardHeader>
            <CardContent>
              {detection?.sentences && check.input_text ? (
                <HighlightedText text={check.input_text} result={detection} className="text-sm leading-7" />
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{check.input_text ?? "Text was not stored."}</p>
              )}
            </CardContent>
          </Card>
          {isRewrite && (
            <Card>
              <CardHeader>
                <CardTitle>Rewritten</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-7">{check.output_text}</p>
              </CardContent>
            </Card>
          )}
          {suggestions && (
            <Card>
              <CardHeader>
                <CardTitle>Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                {suggestions.suggestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No issues were found in this text.</p>
                ) : (
                  <ol className="space-y-3">
                    {suggestions.suggestions.map((s, i) => (
                      <li key={`${s.start}-${s.category}`} className="space-y-2 border-2 border-ink p-3">
                        <div className="flex items-center gap-2">
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-400/25 text-xs font-bold text-amber-700 dark:text-amber-300">
                            {i + 1}
                          </span>
                          <Badge tone="outline">{SUGGESTION_CATEGORIES[s.category] ?? s.category}</Badge>
                        </div>
                        <blockquote className="border-l-2 pl-3 text-sm italic text-muted-foreground">{s.sentence}</blockquote>
                        <p className="text-sm">{s.issue}</p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-bold text-foreground">How to fix: </span>
                          {s.tip}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-6">
          {detection && (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 pt-6">
                {check.ai_score_before != null && <AiGauge probability={Number(check.ai_score_before)} caption="AI probability" />}
                {detection.label && <Badge tone={LABELS[detection.label].tone}>{LABELS[detection.label].text}</Badge>}
              </CardContent>
            </Card>
          )}
          {detection?.document && (
            <Card>
              <CardHeader>
                <CardTitle>Parts</CardTitle>
              </CardHeader>
              <CardContent>
                <DocumentPartsCard document={detection.document} />
              </CardContent>
            </Card>
          )}
          {isRewrite && check.similarity != null && (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 pt-6 text-center">
                <Badge tone={Number(check.similarity) >= 0.75 ? "success" : "warning"}>
                  Meaning kept: {Math.round(Number(check.similarity) * 100)}%
                </Badge>
                <p className="text-xs text-muted-foreground">Review rewritten text before using it, and disclose AI help where it&apos;s required.</p>
              </CardContent>
            </Card>
          )}
          {detection?.explanation && (
            <Card>
              <CardHeader>
                <CardTitle>Why this score?</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  {detection.explanation.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {suggestions && suggestions.summary.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Overall</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  {suggestions.summary.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
