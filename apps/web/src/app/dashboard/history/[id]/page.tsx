import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AiGauge, LABELS } from "@/components/ai-gauge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import type { DetectionResult } from "@/lib/detector/types";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { EditableTitle, TextCheckActions } from "./text-check-actions";

export const metadata: Metadata = { title: "Text check" };

export default async function TextCheckPage({ params }: PageProps<"/dashboard/history/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: check } = await supabase.from("text_checks").select("*").eq("id", id).maybeSingle();
  if (!check) notFound();

  const detection = check.result as DetectionResult | null;
  const isHumanize = check.kind === "humanize";

  return (
    <div className="space-y-6">
      <Link href="/dashboard/history?tab=texts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> History
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <EditableTitle id={check.id} title={check.title || "Untitled text"} />
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge>{isHumanize ? "Humanized" : "AI detection"}</Badge>
            {check.word_count} words · {formatDateTime(check.created_at)}
            {check.tone && <Badge tone="outline" className="capitalize">{check.tone}</Badge>}
            {check.strength && <Badge tone="outline" className="capitalize">{check.strength}</Badge>}
          </p>
        </div>
        <TextCheckActions id={check.id} output={check.output_text} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{isHumanize ? "Original" : "Text"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{check.input_text ?? "Text was not stored."}</p>
            </CardContent>
          </Card>
          {isHumanize && (
            <Card>
              <CardHeader>
                <CardTitle>Humanized</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-7">{check.output_text}</p>
              </CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 pt-6">
              {check.ai_score_before != null && (
                <AiGauge probability={Number(check.ai_score_before)} caption={isHumanize ? "Before" : "AI probability"} />
              )}
              {isHumanize && check.ai_score_after != null && <AiGauge probability={Number(check.ai_score_after)} caption="After" />}
              {detection?.label && <Badge tone={LABELS[detection.label].tone}>{LABELS[detection.label].text}</Badge>}
              {isHumanize && check.similarity != null && (
                <Badge tone="success">Meaning kept: {Math.round(Number(check.similarity) * 100)}%</Badge>
              )}
            </CardContent>
          </Card>
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
        </div>
      </div>
    </div>
  );
}
