import type { DetectionResult, DocumentInfo } from "@/lib/detector/types";
import type { TextRange } from "./split";

const labelFor = (p: number): DetectionResult["label"] => (p >= 0.7 ? "likely_ai" : p <= 0.3 ? "likely_human" : "mixed");
const pct = (p: number) => `${Math.round(p * 100)}%`;

/** Combines per-part results into one document result, weighting each part by its word count. */
export function mergeDetections(
  ranges: TextRange[],
  results: DetectionResult[],
  meta: Omit<DocumentInfo, "parts">,
): DetectionResult {
  const words = results.map((r) => Math.max(1, r.wordCount));
  const totalWords = words.reduce((a, b) => a + b, 0);
  const avg = (pick: (r: DetectionResult) => number) => results.reduce((sum, r, i) => sum + pick(r) * words[i], 0) / totalWords;

  const aiProbability = avg((r) => r.aiProbability);
  const wordCount = results.reduce((sum, r) => sum + r.wordCount, 0);
  const confidence: DetectionResult["confidence"] =
    wordCount < 150 ? "low" : Math.abs(aiProbability - 0.5) > 0.3 && wordCount > 250 ? "high" : "medium";

  const phrases = [...new Set(results.flatMap((r) => r.signals.aiPhrases))];
  const phraseCount = results.reduce((sum, r) => sum + r.signals.aiPhraseCount, 0);

  const highest = results.reduce((best, r, i) => (r.aiProbability > results[best].aiProbability ? i : best), 0);
  const explanation = [
    `Checked in ${results.length} parts. Part ${highest + 1} scored highest at ${pct(results[highest].aiProbability)} AI.`,
  ];
  const seen = new Set<string>();
  for (const line of results.flatMap((r) => r.explanation)) {
    if (line.startsWith("Uses ") || line.startsWith("No strong signals") || seen.has(line)) continue;
    seen.add(line);
    explanation.push(line);
  }
  if (phraseCount >= 3) {
    explanation.splice(1, 0, `Uses ${phraseCount} phrases common in AI writing (e.g. “${phrases.slice(0, 3).join("”, “")}”).`);
  }
  if (explanation.length === 1) explanation.push("No strong signals either way; the document has a mix of human and AI-like patterns.");

  return {
    aiProbability,
    label: labelFor(aiProbability),
    confidence,
    wordCount,
    sentences: results.flatMap((r, i) => r.sentences.map((s) => ({ ...s, start: s.start + ranges[i].start, end: s.end + ranges[i].start }))),
    signals: {
      burstiness: Math.round(avg((r) => r.signals.burstiness) * 100) / 100,
      avgSentenceLength: Math.round(avg((r) => r.signals.avgSentenceLength) * 10) / 10,
      lexicalDiversity: Math.round(avg((r) => r.signals.lexicalDiversity) * 100) / 100,
      aiPhraseCount: phraseCount,
      aiPhrases: phrases.slice(0, 12),
    },
    explanation,
    engine: results.every((r) => r.engine === "ml") ? "ml" : "heuristic",
    document: {
      ...meta,
      parts: results.map((r, i) => ({
        start: ranges[i].start,
        end: ranges[i].end,
        aiProbability: r.aiProbability,
        label: r.label,
        wordCount: r.wordCount,
      })),
    },
  };
}
