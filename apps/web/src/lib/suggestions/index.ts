import "server-only";
import { detectHeuristic, findPhrases, splitSentences } from "@/lib/detector/heuristic";
import { chatCompletion, isLLMConfigured, llmEngineName } from "@/lib/openai";
import { countWords } from "@/lib/utils";
import { SUGGESTION_CATEGORIES, type Suggestion, type SuggestionCategory, type SuggestionResult } from "./types";

const MAX_SUGGESTIONS = 10;
const LONG_SENTENCE_WORDS = 35;

type Sentence = { text: string; start: number; end: number };
type Draft = Omit<Suggestion, "sentence" | "start" | "end"> & { index: number };

const wordsIn = (s: string) => s.match(/[A-Za-z0-9']+/g) ?? [];

/**
 * Suggestions must never contain a rewritten sentence the writer could paste in.
 * Long quoted passages and "try: <new sentence>" style examples are removed.
 */
function sanitize(text: string, maxLength: number) {
  let out = text.replace(/["“]([^"”]*)["”]/g, (match, inner: string) => (wordsIn(inner).length > 4 ? "…" : match));
  out = out.replace(
    /\b(for example|e\.g\.|such as|something like|like this|try|instead|rewrite it as|change it to|you could write)\s*:\s*(.+)$/i,
    (match, lead: string, rest: string) => (wordsIn(rest).length > 5 ? `${lead}.` : match),
  );
  out = out.replace(/\s*[—–]\s*/g, ", ").replace(/\s{2,}/g, " ").trim();
  if (out.length > maxLength) return `${out.slice(0, maxLength - 1).trimEnd()}…`;
  return out && !/[.!?…]$/.test(out) ? `${out}.` : out;
}

const ROBOTIC_THRESHOLD = 0.62;
const TRANSITION_OPENER = /^(moreover|furthermore|additionally|however|overall|ultimately|in conclusion|in summary|firstly|secondly|finally)\b/i;

/** Sentences the detector scores as most machine-like, with the reasons a writer can act on. */
function roboticDrafts(input: string, sentences: Sentence[]): Draft[] {
  const scores = detectHeuristic(input).sentences;
  return scores
    .filter((s) => s.ai >= ROBOTIC_THRESHOLD && wordsIn(s.text).length >= 6)
    .sort((a, b) => b.ai - a.ai)
    .slice(0, 4)
    .flatMap((score) => {
      const index = sentences.findIndex((s) => s.start === score.start);
      if (index < 0) return [];
      const text = score.text;
      const reasons: string[] = [];
      if (TRANSITION_OPENER.test(text.trim())) reasons.push("it opens with a formal transition word");
      if (findPhrases(text.replace(/[\u2018\u2019]/g, "'").toLowerCase()).length) reasons.push("it relies on stock phrases");
      if (!/\b\w+'(t|s|re|ve|ll|d|m)\b/i.test(text)) reasons.push("it has no contractions, so it sounds stiff");
      if (!/\b(i|my|me|we|our|you)\b/i.test(text)) reasons.push("there's no personal voice in it");
      return [
        {
          index,
          category: "robotic" as const,
          issue: `This sentence reads as machine-like${reasons.length ? ` because ${reasons.slice(0, 2).join(" and ")}` : ""}.`,
          tip: "Say it the way you'd explain it out loud: start with the main point, use plain words, and add a concrete detail or your own view.",
        },
      ];
    });
}

function heuristicDrafts(input: string, sentences: Sentence[]): Draft[] {
  const drafts: Draft[] = roboticDrafts(input, sentences);
  let previousOpening = "";
  let openingRun = 1;

  sentences.forEach((sentence, index) => {
    const words = wordsIn(sentence.text);
    if (words.length < 3) return;

    const phrases = findPhrases(sentence.text.replace(/[\u2018\u2019]/g, "'").toLowerCase());
    if (phrases.length) {
      drafts.push({
        index,
        category: "filler",
        issue: `"${phrases[0]}" is a stock phrase that makes writing sound generic.`,
        tip: "Cut it, or replace it with the specific thing you actually mean, in plain words.",
      });
    }

    if (words.length > LONG_SENTENCE_WORDS) {
      drafts.push({
        index,
        category: "clarity",
        issue: `This sentence is ${words.length} words long, which makes it hard to follow.`,
        tip: "Split it where the idea changes, and give the most important point its own sentence.",
      });
    }

    if (/\b(is|are|was|were|be|been|being)\s+(\w+ed|given|made|done|taken|seen|shown|known|written)\b/i.test(sentence.text)) {
      drafts.push({
        index,
        category: "voice",
        issue: "This sentence uses the passive voice, so it's unclear who is doing the action.",
        tip: "Start with the person or thing doing the action, then the verb.",
      });
    }

    const firstWord = words[0] ?? "";
    const opening = firstWord.toLowerCase();
    openingRun = opening === previousOpening ? openingRun + 1 : 1;
    previousOpening = opening;
    if (openingRun === 3) {
      drafts.push({
        index,
        category: "repetition",
        issue: `This is the third sentence in a row that starts with "${firstWord}".`,
        tip: "Vary how your sentences begin: lead with a detail, a time, or the main idea itself.",
      });
    }
  });

  return drafts;
}

function heuristicSummary(input: string, sentences: Sentence[]) {
  const lengths = sentences.map((s) => wordsIn(s.text).length).filter((n) => n >= 3);
  const summary: string[] = [];
  if (detectHeuristic(input).aiProbability >= ROBOTIC_THRESHOLD) {
    summary.push("Overall this reads formal and machine-like. Your own examples, opinions and a more conversational rhythm will make it sound like you.");
  }
  if (lengths.length >= 5) {
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const sd = Math.sqrt(lengths.reduce((s, n) => s + (n - mean) ** 2, 0) / lengths.length);
    if (sd < 4) {
      summary.push("Most of your sentences are a similar length. Mixing short and long sentences makes writing easier to read.");
    }
  }
  return summary;
}

async function llmFeedback(sentences: Sentence[], hints: Draft[]): Promise<{ drafts: Draft[]; summary: string[] }> {
  const categories = Object.keys(SUGGESTION_CATEGORIES).join(", ");
  const numbered = sentences.map((s, i) => `[${i + 1}] ${s.text}`).join("\n");
  const hintLines = hints.map((h) => `- sentence ${h.index + 1}: ${h.category}`).join("\n");

  const raw = await chatCompletion(
    [
      {
        role: "system",
        content: [
          "You are a patient writing tutor. You help writers make their own text sound natural, clear and like a real person wrote it. You never rewrite it for them: they make every change themselves.",
          "Hard rules:",
          "- Never write a replacement, corrected or example version of any sentence, and never write new sentences the writer could copy.",
          "- When pointing at a problem you may quote at most 3 words from the text.",
          "- Each tip explains what to change and why, as an instruction (for example: cut the opening phrase and start with the main point).",
          "- First priority: sentences that sound robotic or AI-generated (category robotic). Explain what makes them sound that way, such as stock phrases, formal transition openers, every sentence the same length, no contractions, abstract words instead of concrete details, rule-of-three lists, or no personal voice, and how the writer can make it sound like themselves.",
          "- Also look for: unclear or overloaded sentences, wordiness, filler phrases, vague abstract words, repetition, monotonous rhythm, unnecessary passive voice, tone that doesn't fit, and grammar mistakes.",
          "- Choose the 3 to 8 most useful points and skip sentences that are already fine. Use plain, encouraging language and no dashes.",
          `Reply with JSON only: {"summary": [up to 3 short observations about the whole text], "suggestions": [{"index": <sentence number>, "category": <one of: ${categories}>, "issue": <one sentence>, "tip": <one or two sentences>}]}`,
        ].join("\n"),
      },
      {
        role: "user",
        content: `TEXT (numbered sentences):\n${numbered}${hintLines ? `\n\nAutomated checks also flagged:\n${hintLines}` : ""}`,
      },
    ],
    { temperature: 0.3, maxTokens: 1400, json: true },
  );

  const parsed = JSON.parse(raw) as {
    summary?: unknown;
    suggestions?: { index?: unknown; category?: unknown; issue?: unknown; tip?: unknown }[];
  };

  const drafts: Draft[] = [];
  for (const s of Array.isArray(parsed.suggestions) ? parsed.suggestions : []) {
    const index = Number(s.index) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= sentences.length) continue;
    const category = (typeof s.category === "string" && s.category in SUGGESTION_CATEGORIES ? s.category : "clarity") as SuggestionCategory;
    const issue = typeof s.issue === "string" ? sanitize(s.issue, 220) : "";
    const tip = typeof s.tip === "string" ? sanitize(s.tip, 320) : "";
    if (issue && tip) drafts.push({ index, category, issue, tip });
  }
  const summary = (Array.isArray(parsed.summary) ? parsed.summary : [])
    .filter((x): x is string => typeof x === "string")
    .map((x) => sanitize(x, 240))
    .filter(Boolean)
    .slice(0, 3);

  return { drafts, summary };
}

/** Points out unclear, wordy or generic sentences and explains how to fix them, without rewriting anything. */
export async function suggestImprovements(input: string): Promise<SuggestionResult> {
  const sentences = splitSentences(input);
  const heuristics = heuristicDrafts(input, sentences);

  let drafts = heuristics;
  let summary = heuristicSummary(input, sentences);
  let engine = "heuristic";

  if (isLLMConfigured()) {
    try {
      const llm = await llmFeedback(sentences, heuristics);
      if (llm.drafts.length) {
        const covered = new Set(llm.drafts.map((d) => d.index));
        drafts = [...llm.drafts, ...heuristics.filter((h) => !covered.has(h.index))];
        summary = llm.summary.length ? llm.summary : summary;
        engine = llmEngineName();
      }
    } catch {
      // Fall back to the built-in checks.
    }
  }

  const seen = new Set<string>();
  const suggestions = drafts
    .filter((d) => {
      const key = `${d.index}:${d.category}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_SUGGESTIONS)
    .sort((a, b) => a.index - b.index)
    .map(({ index, ...rest }) => ({ ...rest, sentence: sentences[index].text, start: sentences[index].start, end: sentences[index].end }));

  return { suggestions, summary, wordCount: countWords(input), engine };
}
