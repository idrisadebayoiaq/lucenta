import type { DetectionResult, SentenceScore } from "./types";

/**
 * Lightweight statistical detector used until the ML service (doc 03) is deployed.
 * It is intentionally conservative and less accurate than a trained classifier.
 */

export const AI_PHRASES = [
  "delve", "delves", "delving", "tapestry", "testament to", "in today's fast-paced", "in today's digital", "ever-evolving",
  "ever-changing", "it's important to note", "it is important to note", "it's worth noting", "it is worth noting",
  "moreover", "furthermore", "additionally", "in conclusion", "in summary", "overall,", "ultimately,", "navigate the",
  "navigating the", "landscape", "realm", "seamless", "seamlessly", "leverage", "leveraging", "robust", "holistic",
  "pivotal", "crucial", "vital role", "plays a crucial role", "plays a vital role", "a myriad of", "myriad", "foster",
  "fostering", "embark", "embarking", "unlock", "unleash", "harness", "elevate", "empower", "cutting-edge",
  "game-changer", "game changer", "paradigm", "synergy", "multifaceted", "nuanced", "intricate", "meticulous",
  "meticulously", "comprehensive", "underscore", "underscores", "showcasing", "showcase", "bustling", "vibrant",
  "whether you're", "look no further", "not only", "but also", "at the end of the day", "when it comes to",
  "a testament", "stands as", "serves as a", "in the realm of", "dive into", "dive deep", "deep dive", "let's explore",
  "resonate", "resonates", "commendable", "enhance", "enhancing", "streamline", "optimize", "invaluable",
];

export function splitSentences(text: string): { text: string; start: number; end: number }[] {
  const out: { text: string; start: number; end: number }[] = [];
  const re = /[^.!?\n]+(?:[.!?]+["')\]]*|\n+|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const raw = m[0];
    const trimmed = raw.trim();
    if (!trimmed) {
      if (re.lastIndex === m.index) re.lastIndex++;
      continue;
    }
    const start = m.index + raw.indexOf(trimmed);
    out.push({ text: trimmed, start, end: start + trimmed.length });
  }
  return out;
}

const words = (s: string) => s.toLowerCase().match(/[a-z']+/g) ?? [];

function stdev(values: number[]) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1));
}

export function findPhrases(text: string) {
  const lower = text.toLowerCase();
  return AI_PHRASES.filter((p) => new RegExp(`(^|[^a-z])${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(lower));
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

function sentenceScore(sentence: string, docLengthMean: number) {
  const w = words(sentence);
  const phrases = findPhrases(sentence).length;
  const lengthDelta = Math.abs(w.length - docLengthMean) / Math.max(docLengthMean, 1);
  const hasContraction = /\b\w+'(t|s|re|ve|ll|d|m)\b/i.test(sentence);
  const hasPersonal = /\b(i|my|me|we|our)\b/i.test(sentence);
  const listy = /^(first|second|third|finally|additionally|moreover|furthermore|however|overall|in conclusion)\b/i.test(sentence.trim());
  let x = 0.2 + phrases * 1.1 - lengthDelta * 1.4 + (listy ? 0.8 : 0) - (hasContraction ? 0.8 : 0) - (hasPersonal ? 0.5 : 0);
  if (w.length >= 15 && w.length <= 30) x += 0.3;
  if (/[—–]/.test(sentence)) x += 0.3;
  return sigmoid(x);
}

const normalizeQuotes = (s: string) => s.replace(/[\u2018\u2019\u02BC]/g, "'");

export function detectHeuristic(input: string): DetectionResult {
  const text = normalizeQuotes(input);
  const sentences = splitSentences(text);
  const allWords = words(text);
  const lengths = sentences.map((s) => words(s.text).length).filter((n) => n > 0);
  const avgLen = lengths.reduce((a, b) => a + b, 0) / Math.max(lengths.length, 1);
  const burstiness = avgLen ? stdev(lengths) / avgLen : 0;

  const sample = allWords.slice(0, 400);
  const lexicalDiversity = sample.length ? new Set(sample).size / sample.length : 0;
  const phrases = findPhrases(text);
  const phraseDensity = (phrases.length / Math.max(allWords.length, 1)) * 100;
  const contractions = (text.match(/\b\w+'(t|s|re|ve|ll|d|m)\b/gi) ?? []).length / Math.max(sentences.length, 1);
  const emDashes = (text.match(/—/g) ?? []).length / Math.max(sentences.length, 1);
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());
  const paraLengths = paragraphs.map((p) => words(p).length);
  const paraUniformity = paragraphs.length >= 3 ? 1 - Math.min(1, stdev(paraLengths) / (paraLengths.reduce((a, b) => a + b, 0) / paraLengths.length)) : 0.5;

  let x = -0.4;
  x += (0.45 - burstiness) * 5;
  x += phraseDensity * 0.9;
  x -= contractions * 1.2;
  x += emDashes * 1.5;
  x += (paraUniformity - 0.5) * 1.5;
  x += lexicalDiversity > 0.45 && lexicalDiversity < 0.62 ? 0.3 : -0.2;
  const aiProbability = Math.min(0.99, Math.max(0.01, sigmoid(x)));

  const sentenceScores: SentenceScore[] = sentences.map((s) => {
    const local = sentenceScore(s.text, avgLen);
    return { ...s, text: input.slice(s.start, s.end), ai: Math.min(0.99, Math.max(0.01, 0.55 * local + 0.45 * aiProbability)) };
  });

  const explanation: string[] = [];
  if (burstiness < 0.35) explanation.push("Sentence lengths are very uniform (low burstiness), which is typical of AI text.");
  else if (burstiness > 0.55) explanation.push("Sentence lengths vary a lot, which is typical of human writing.");
  if (phrases.length >= 3) explanation.push(`Uses ${phrases.length} phrases common in AI writing (e.g. “${phrases.slice(0, 3).join("”, “")}”).`);
  if (contractions < 0.1 && sentences.length > 4) explanation.push("Almost no contractions (it's, don't, we're), which makes the tone formal and machine-like.");
  if (contractions > 0.4) explanation.push("Frequent contractions give it a natural, conversational tone.");
  if (emDashes > 0.3) explanation.push("Heavy use of em dashes (—), a common AI style marker.");
  if (paraUniformity > 0.75) explanation.push("Paragraphs are very similar in length and structure.");
  if (explanation.length === 0) explanation.push("No strong signals either way; the text has a mix of human and AI-like patterns.");

  const wordCount = allWords.length;
  const confidence = wordCount < 150 ? "low" : Math.abs(aiProbability - 0.5) > 0.3 && wordCount > 250 ? "high" : "medium";

  return {
    aiProbability,
    label: aiProbability >= 0.7 ? "likely_ai" : aiProbability <= 0.3 ? "likely_human" : "mixed",
    confidence,
    wordCount,
    sentences: sentenceScores,
    signals: {
      burstiness: Math.round(burstiness * 100) / 100,
      avgSentenceLength: Math.round(avgLen * 10) / 10,
      lexicalDiversity: Math.round(lexicalDiversity * 100) / 100,
      aiPhraseCount: phrases.length,
      aiPhrases: phrases.slice(0, 12),
    },
    explanation,
    engine: "heuristic",
  };
}
