/** Display names for text_checks.kind ("humanize" is the stored value for Rewriter rewrites). */
export const TEXT_CHECK_LABELS: Record<string, string> = {
  detect: "AI detection",
  humanize: "Rewrite",
  suggest: "Writing suggestions",
};

export function textCheckLabel(kind: string) {
  return TEXT_CHECK_LABELS[kind] ?? kind;
}

/** Only detections show an AI score in lists; rewrites and suggestions are about the writing, not the score. */
export function textCheckAiScore(check: { kind: string; ai_score_before: number | null }) {
  return check.kind === "detect" ? check.ai_score_before : null;
}
