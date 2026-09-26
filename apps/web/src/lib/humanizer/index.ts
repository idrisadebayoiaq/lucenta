import { detectText } from "@/lib/detector";
import { AI_PHRASES } from "@/lib/detector/heuristic";
import type { DetectionResult } from "@/lib/detector/types";
import { chatCompletion, isLLMConfigured, llmEngineName } from "@/lib/openai";
import type { Strength, Tone } from "./options";

const TONE_GUIDE: Record<Tone, string> = {
  standard: "clear, natural everyday writing",
  casual: "relaxed and conversational, like talking to a friend; contractions welcome",
  professional: "confident and polished business writing, but still warm and direct",
  academic: "formal academic register with precise wording; keep citations exactly; contractions sparingly",
  creative: "vivid and expressive with varied rhythm and fresh word choices",
  simple: "plain language a 12-year-old could follow; short sentences and common words",
};

const STRENGTH_GUIDE: Record<Strength, string> = {
  light: "Make minimal edits: fix robotic phrasing and rhythm but keep most sentences recognisable.",
  balanced: "Rewrite sentences freely while keeping every idea and the overall structure.",
  aggressive: "Fully restructure sentences and paragraphs in your own words while keeping every idea and fact.",
};

const REPLACEMENTS: [RegExp, string[]][] = [
  [/\bdelve(s)? into\b/gi, ["look$1 at", "get$1 into", "explore$1"]],
  [/\bmoreover,?\s*/gi, ["Also, ", "On top of that, ", "Plus, "]],
  [/\bfurthermore,?\s*/gi, ["Also, ", "Beyond that, ", "What's more, "]],
  [/\badditionally,?\s*/gi, ["Also, ", "And ", "On top of that, "]],
  [/\bin conclusion,?\s*/gi, ["So, ", "All in all, ", "To wrap up, "]],
  [/\bit(?:'s| is) (?:important|worth) (?:to note|noting) that\s*/gi, ["", "Keep in mind that ", "Note that "]],
  [/\bin today's fast-paced (?:world|environment),?\s*/gi, ["These days, ", "Today, ", "Right now, "]],
  [/\ba myriad of\b/gi, ["plenty of", "lots of", "many"]],
  [/\b(?:leverag|utiliz)ing\b/gi, ["using", "drawing on"]],
  [/\b(?:leverag|utiliz)es\b/gi, ["uses"]],
  [/\b(?:leverag|utiliz)ed\b/gi, ["used"]],
  [/\b(?:leverag|utiliz)e\b/gi, ["use"]],
  [/\bseamless(ly)?\b/gi, ["smooth$1", "easy", "effortless$1"]],
  [/\btapestry\b/gi, ["mix", "blend", "patchwork"]],
  [/\bplays a (?:crucial|vital|pivotal) role in\b/gi, ["matters a lot for", "is key to", "is central to"]],
];

const BANNED_PHRASES = [...new Set(AI_PHRASES.map((p) => p.replace(/[,.]$/, "")))].join(", ");

function detectorFeedback(result: DetectionResult, meaningOk: boolean) {
  const flagged = [...result.sentences]
    .sort((a, b) => b.ai - a.ai)
    .slice(0, 4)
    .filter((s) => s.ai >= 0.5)
    .map((s) => `  • "${s.text}"`);
  return [
    `\nYour previous rewrite still reads as ${Math.round(result.aiProbability * 100)}% AI-written. Specific problems:`,
    ...result.explanation.map((e) => `- ${e}`),
    result.signals.aiPhrases.length ? `- Remove these phrases entirely: ${result.signals.aiPhrases.join(", ")}.` : "",
    flagged.length ? `- These sentences sound the most machine-like; restructure them completely:\n${flagged.join("\n")}` : "",
    meaningOk ? "" : "- It also drifted from the original: restore every idea from the original and remove anything that wasn't in it.",
    "Rewrite again from scratch, fixing all of the above while keeping the meaning.",
  ]
    .filter(Boolean)
    .join("\n");
}

function pick<T>(items: T[], seed: number) {
  return items[seed % items.length];
}

export function postProcess(text: string) {
  let seed = text.length;
  let out = text;
  for (const [pattern, options] of REPLACEMENTS) {
    out = out.replace(pattern, (match, g1) => {
      seed = (seed * 31 + 7) % 9973;
      let replacement = pick(options, seed).replace("$1", g1 ?? "");
      if (match[0] === match[0].toUpperCase() && replacement) replacement = replacement[0].toUpperCase() + replacement.slice(1);
      return replacement;
    });
  }
  out = out.replace(/\s*—\s*/g, (_, i: number) => (i % 3 === 0 ? " — " : ", "));
  out = out.replace(/(^|[.!?]\s+)([a-z])/g, (_, p, c: string) => p + c.toUpperCase());
  return out.replace(/ {2,}/g, " ").trim();
}

function protectedTokens(text: string) {
  const numbers = text.match(/\b\d[\d,.:%/-]*\b/g) ?? [];
  const quotes = text.match(/"[^"]{2,200}"|“[^”]{2,200}”/g) ?? [];
  const urls = text.match(/https?:\/\/\S+/g) ?? [];
  return [...new Set([...numbers, ...quotes, ...urls])];
}

function contentWords(text: string) {
  const stop = new Set("the a an and or but if of to in on for with at by from as is are was were be been it this that these those you your we our they their i my".split(" "));
  return new Set((text.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((w) => !stop.has(w)).map((w) => w.slice(0, 6)));
}

/** Rough meaning-overlap score until embedding similarity is added (doc 03). */
export function similarityScore(a: string, b: string) {
  const A = contentWords(a);
  const B = contentWords(b);
  if (!A.size || !B.size) return 0;
  const inter = [...A].filter((w) => B.has(w)).length;
  return Math.min(1, (inter / Math.min(A.size, B.size)) * 1.15);
}

/** LLM judge for paraphrases; word overlap badly underrates good rewrites. */
async function judgeMeaning(original: string, rewrite: string): Promise<{ score: number; addedClaims: boolean }> {
  try {
    const raw = await chatCompletion(
      [
        {
          role: "system",
          content:
            'You compare an ORIGINAL text with a REWRITE. Reply with JSON only: {"meaning": <0-100, how completely the rewrite preserves every idea and fact of the original>, "added_claims": <true if the rewrite states facts, examples or claims not present in the original>}.',
        },
        { role: "user", content: `ORIGINAL:\n${original}\n\nREWRITE:\n${rewrite}` },
      ],
      { temperature: 0, maxTokens: 60, json: true, tier: "fast" },
    );
    const parsed = JSON.parse(raw) as { meaning?: number; added_claims?: boolean };
    if (typeof parsed.meaning !== "number") throw new Error("bad judge output");
    return { score: Math.max(0, Math.min(1, parsed.meaning / 100)), addedClaims: !!parsed.added_claims };
  } catch {
    return { score: similarityScore(original, rewrite), addedClaims: false };
  }
}

function systemPrompt(tone: Tone, strength: Strength, keepWords: string[], protectedList: string[]) {
  return [
    "You rewrite text so it reads like it was written by a thoughtful human writer, not an AI model.",
    `Tone: ${TONE_GUIDE[tone]}.`,
    STRENGTH_GUIDE[strength],
    "Rules:",
    "- Keep the exact meaning, every fact, name, number, date, quote, citation and URL.",
    "- Vary sentence length a lot. Include a few very short sentences (3-7 words) and at least one long one (25+ words). Never write three sentences of similar length in a row.",
    `- Never use these words or phrases (or close variants): ${BANNED_PHRASES}.`,
    "- Don't start consecutive sentences the same way, and don't open sentences with transition words. Avoid rule-of-three lists and perfectly parallel structure.",
    tone === "academic"
      ? "- Use contractions sparingly. Prefer concrete, specific words over vague abstractions."
      : "- Use contractions naturally (it's, don't, they're, that's) in most sentences. Prefer concrete, specific words over vague abstractions like 'growth', 'success' or 'innovation'.",
    "- Sound like a person with a point of view explaining this to a reader, not a brochure. Plain verbs beat fancy ones.",
    "- Use em dashes rarely. Don't add headings, bullet points or emojis unless the original had them.",
    "- Keep paragraph breaks roughly where they are. Keep the length within about 15% of the original.",
    "- Never add new claims, opinions, or information that isn't in the original. Don't add typos on purpose.",
    keepWords.length ? `- Keep these words exactly as written: ${keepWords.join(", ")}.` : "",
    protectedList.length ? `- These must appear unchanged: ${protectedList.slice(0, 40).join(" | ")}` : "",
    "Return only the rewritten text, with no preamble or explanation.",
  ]
    .filter(Boolean)
    .join("\n");
}

export type HumanizeResult = {
  text: string;
  aiScoreBefore: number;
  aiScoreAfter: number;
  similarity: number;
  iterations: number;
  engine: string;
};

export class HumanizerNotConfiguredError extends Error {}

export async function humanize(
  input: string,
  { tone, strength, keepWords = [] }: { tone: Tone; strength: Strength; keepWords?: string[] },
): Promise<HumanizeResult> {
  if (!isLLMConfigured()) {
    throw new HumanizerNotConfiguredError("The humanizer engine isn't configured yet. Add OPENROUTER_API_KEY or OPENAI_API_KEY to enable it.");
  }

  const before = await detectText(input);
  const protectedList = [...protectedTokens(input), ...keepWords];
  const target = 0.2;
  let best: { text: string; score: number; similarity: number } | null = null;
  let iterations = 0;
  let previous: { text: string; detection: DetectionResult; meaningOk: boolean } | null = null;

  for (let i = 0; i < 3; i++) {
    iterations++;
    const temperature = Math.min(0.85 + i * 0.1, 1.1);
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt(tone, i > 0 && strength === "light" ? "balanced" : strength, keepWords, protectedList) },
      { role: "user", content: input },
    ];
    if (previous) {
      messages.push({ role: "assistant", content: previous.text }, { role: "user", content: detectorFeedback(previous.detection, previous.meaningOk) });
    }
    const raw = await chatCompletion(messages, { temperature, maxTokens: Math.min(4000, Math.ceil(input.length / 2.5) + 400) });
    const text = postProcess(raw);
    const missing = protectedList.filter((t) => !text.includes(t)).length;
    const [detection, meaning] = await Promise.all([detectText(text), judgeMeaning(input, text)]);
    const similarity = meaning.score;
    const meaningOk = similarity >= 0.75 && !meaning.addedClaims;
    const penalty = missing * 0.05 + (meaningOk ? 0 : 0.3);

    if (!best || detection.aiProbability + penalty < best.score) best = { text, score: detection.aiProbability + penalty, similarity };
    if (detection.aiProbability <= target && meaningOk && missing === 0) break;
    previous = { text, detection, meaningOk };
  }

  const finalScore = (await detectText(best!.text)).aiProbability;
  return {
    text: best!.text,
    aiScoreBefore: before.aiProbability,
    aiScoreAfter: finalScore,
    similarity: best!.similarity,
    iterations,
    engine: llmEngineName(),
  };
}
