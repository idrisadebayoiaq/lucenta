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
  /** Set when an uploaded document was checked in parts. Sentence offsets are relative to the whole document. */
  document?: DocumentInfo;
};

export type DocumentPart = { start: number; end: number; aiProbability: number; label: DetectionResult["label"]; wordCount: number };
export type DocumentInfo = { fileName: string; parts: DocumentPart[]; totalParts: number };

export const MIN_DETECT_WORDS = 80;
