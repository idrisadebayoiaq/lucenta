export const SUGGESTION_CATEGORIES = {
  clarity: "Clarity",
  wordiness: "Wordiness",
  filler: "Filler phrase",
  vague: "Vague wording",
  repetition: "Repetition",
  rhythm: "Sentence rhythm",
  voice: "Passive voice",
  tone: "Tone",
  grammar: "Grammar",
} as const;

export type SuggestionCategory = keyof typeof SUGGESTION_CATEGORIES;

export type Suggestion = {
  /** Exact sentence from the submitted text, with its character offsets. */
  sentence: string;
  start: number;
  end: number;
  category: SuggestionCategory;
  /** What's wrong, in one sentence. */
  issue: string;
  /** How to fix it yourself. Never a replacement sentence. */
  tip: string;
};

export type SuggestionResult = {
  suggestions: Suggestion[];
  /** A few overall observations about the whole text. */
  summary: string[];
  wordCount: number;
  engine: string;
};
