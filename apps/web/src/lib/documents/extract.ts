import "server-only";
import { DOCUMENT_TYPES, MAX_DOCUMENT_BYTES, normalizeDocumentText } from "./split";

export class DocumentError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export function documentExtension(fileName: string) {
  const match = /\.[a-z0-9]+$/i.exec(fileName);
  return match ? match[0].toLowerCase() : "";
}

/**
 * PDFs store one entry per printed line. Joins lines back into paragraphs: a line that is much shorter
 * than a typical full line (a heading or the end of a paragraph) ends its paragraph. Hyphenated words are rejoined.
 */
function reflowPdfPage(page: string) {
  const lines = page.split("\n").map((l) => l.trim());
  const lengths = lines.filter(Boolean).map((l) => l.length).sort((a, b) => a - b);
  if (lengths.length < 3) return lines.join("\n");
  const full = lengths[Math.floor(lengths.length * 0.8)];
  let out = "";
  lines.forEach((line, i) => {
    if (!line) {
      out += "\n\n";
      return;
    }
    const prev = lines[i - 1];
    if (!out || out.endsWith("\n")) out += line;
    else if (prev && prev.length < full * 0.7) out += `\n\n${line}`;
    else if (out.endsWith("-") && /^[a-z]/.test(line)) out = out.slice(0, -1) + line;
    else out += ` ${line}`;
  });
  return out;
}

async function extractPdf(data: Uint8Array) {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(data);
  const { text } = await extractText(pdf, { mergePages: false });
  return text.map(reflowPdfPage).join("\n\n");
}

async function extractDocx(data: Buffer) {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: data });
  return value;
}

/** Reads the plain text out of an uploaded .docx, .pdf, .txt or .md file. Formatting and images are dropped. */
export async function extractDocumentText(file: File) {
  const ext = documentExtension(file.name);
  if (!DOCUMENT_TYPES.includes(ext)) {
    throw new DocumentError("UNSUPPORTED_FILE", `Upload a ${DOCUMENT_TYPES.join(", ")} file. Old .doc files need to be saved as .docx first.`);
  }
  if (file.size === 0) throw new DocumentError("EMPTY_FILE", "This file is empty.");
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new DocumentError("FILE_TOO_LARGE", `Files can be up to ${MAX_DOCUMENT_BYTES / 1024 / 1024} MB.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let raw: string;
  try {
    if (ext === ".pdf") raw = await extractPdf(new Uint8Array(buffer));
    else if (ext === ".docx") raw = await extractDocx(buffer);
    else raw = buffer.toString("utf8");
  } catch (err) {
    console.error("[documents] could not read file", ext, err);
    throw new DocumentError("UNREADABLE_FILE", "We couldn't read this file. It may be damaged or password-protected.");
  }

  const text = normalizeDocumentText(raw);
  if (!text) {
    throw new DocumentError(
      "NO_TEXT",
      ext === ".pdf" ? "No text found. This PDF may be a scan or images of text, which we can't read yet." : "No text found in this file.",
    );
  }
  return text;
}
