import "server-only";
import type { Report } from "@/lib/analyzer/types";
import type { DetectionResult } from "@/lib/detector/types";
import type { Database } from "@/lib/supabase/database.types";

type ScanRow = Pick<
  Database["public"]["Tables"]["scans"]["Row"],
  "id" | "url" | "device" | "status" | "overall_score" | "grade" | "error" | "created_at" | "completed_at"
>;

export const SCAN_COLUMNS = "id,url,device,status,overall_score,grade,error,created_at,completed_at";

export function auditSummary(scan: ScanRow) {
  return {
    id: scan.id,
    url: scan.url,
    device: scan.device,
    status: scan.status,
    score: scan.overall_score,
    grade: scan.grade,
    error: scan.error,
    created_at: scan.created_at,
    completed_at: scan.completed_at,
  };
}

/** The public shape of a report. Field names are part of the API contract, so change them with care. */
export function auditReport(report: Report) {
  return {
    final_url: report.finalUrl,
    page: report.page,
    summary: report.summary,
    audience: report.ai?.audience ?? null,
    strengths: report.ai?.strengths ?? [],
    categories: Object.fromEntries(
      Object.entries(report.categories).map(([key, c]) => [
        key,
        { score: c.score, checks: c.checks.map(({ id, title, status, score, value, details }) => ({ id, title, status, score, value, details })) },
      ]),
    ),
    fixes: report.recommendations.map((r) => ({
      id: r.id,
      category: r.category,
      title: r.title,
      impact: r.impact,
      effort: r.effort,
      why: r.why,
      how: r.how,
      source: r.source ?? "rules",
    })),
    missing: report.missing,
    metrics: {
      ttfb_ms: report.metrics.ttfbMs,
      html_kb: report.metrics.htmlKb,
      page_weight_kb: report.metrics.pageWeightKb ?? null,
      requests: report.metrics.requests ?? null,
      status_code: report.metrics.statusCode,
      redirects: report.metrics.redirects,
    },
    tech_stack: report.techStack,
  };
}

export function detectionResult(result: DetectionResult) {
  return {
    ai_probability: Number(result.aiProbability.toFixed(4)),
    label: result.label,
    confidence: result.confidence,
    word_count: result.wordCount,
    sentences: result.sentences.map((s) => ({ text: s.text, start: s.start, end: s.end, ai_probability: Number(s.ai.toFixed(4)) })),
    signals: {
      burstiness: result.signals.burstiness,
      avg_sentence_length: result.signals.avgSentenceLength,
      lexical_diversity: result.signals.lexicalDiversity,
      ai_phrases: result.signals.aiPhrases,
    },
    explanation: result.explanation,
  };
}
