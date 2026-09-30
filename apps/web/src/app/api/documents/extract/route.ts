import { NextResponse, type NextRequest } from "next/server";
import { DocumentError, extractDocumentText } from "@/lib/documents/extract";
import { MAX_DOCUMENT_PARTS, splitDocument } from "@/lib/documents/split";
import { getCurrentUser } from "@/lib/supabase/server";
import { countWords } from "@/lib/utils";

export const maxDuration = 30;

function error(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Returns the text of an uploaded document. Nothing is stored and no daily text is used. */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return error("UNAUTHORIZED", "Please log in to upload documents.", 401);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return error("INVALID_INPUT", "Choose a file to upload.", 400);

  let text: string;
  try {
    text = await extractDocumentText(file);
  } catch (err) {
    if (err instanceof DocumentError) return error(err.code, err.message, 400);
    throw err;
  }

  const ranges = splitDocument(text);
  const truncated = ranges.length > MAX_DOCUMENT_PARTS;
  if (truncated) text = text.slice(0, ranges[MAX_DOCUMENT_PARTS - 1].end);

  return NextResponse.json({
    fileName: file.name.slice(0, 120),
    text,
    words: countWords(text),
    truncated,
    totalParts: ranges.length,
  });
}
