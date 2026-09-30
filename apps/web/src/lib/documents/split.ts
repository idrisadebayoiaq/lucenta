import { DAILY_CONTENT_LIMIT, MAX_TEXT_CHARS } from "@/lib/limits";

export const DOCUMENT_TYPES = [".docx", ".pdf", ".txt", ".md"];
export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
/** Each part uses one daily text, so a document can never need more parts than the daily limit. */
export const MAX_DOCUMENT_PARTS = DAILY_CONTENT_LIMIT;
export const MAX_DOCUMENT_CHARS = MAX_DOCUMENT_PARTS * MAX_TEXT_CHARS;

export type TextRange = { start: number; end: number };

/** Tidies extracted text: normalised line endings, no trailing spaces, at most one blank line in a row. */
export function normalizeDocumentText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function bestCut(text: string, from: number, target: number, max: number) {
  const window = text.slice(from, max);
  const minLen = Math.floor((target - from) * 0.6);
  const breaks: RegExp[] = [/\n\s*\n/g, /\n/g, /[.!?]["')\]]?\s/g, /\s/g];
  for (const re of breaks) {
    let best = -1;
    for (const m of window.matchAll(re)) {
      const end = m.index + m[0].length;
      if (end < minLen) continue;
      if (best === -1 || Math.abs(from + end - target) < Math.abs(from + best - target)) best = end;
    }
    if (best > 0) return from + best;
  }
  return max;
}

/**
 * Splits text into parts of at most `maxChars`, cutting at paragraph, then sentence, then word breaks,
 * and sizing parts evenly so the last one isn't a tiny leftover. Ranges are trimmed of surrounding whitespace.
 * Part sizes depend on the whole text, so to check only the first N parts, split the full text and take N.
 */
export function splitDocument(text: string, maxChars = MAX_TEXT_CHARS): TextRange[] {
  const ranges: TextRange[] = [];
  let pos = 0;
  while (pos < text.length) {
    while (pos < text.length && /\s/.test(text[pos])) pos++;
    if (pos >= text.length) break;
    const remaining = text.length - pos;
    let end: number;
    if (remaining <= maxChars) {
      end = text.length;
    } else {
      const partsLeft = Math.ceil(remaining / maxChars);
      const target = pos + Math.ceil(remaining / partsLeft);
      end = bestCut(text, pos, target, pos + maxChars);
    }
    let trimmedEnd = end;
    while (trimmedEnd > pos && /\s/.test(text[trimmedEnd - 1])) trimmedEnd--;
    ranges.push({ start: pos, end: trimmedEnd });
    pos = end;
  }
  return ranges;
}
