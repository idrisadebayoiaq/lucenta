export type SentenceScore = { text: string; start: number; end: number; ai: number };

export type DetectionResult = {
  aiProbability: number;
  label: "likely_human" | "mixed" | "likely_ai";
  confidence: "low" | "medium" | "high";
  wordCount: number;
  sentences: SentenceScore[];
  signals: {
    burstiness: number;
    avgSentenceLength: number;
    lexicalDiversity: number;
    aiPhraseCount: number;
    aiPhrases: string[];
  };
  explanation: string[];
  engine: "heuristic" | "ml";
};

export const MIN_DETECT_WORDS = 80;
