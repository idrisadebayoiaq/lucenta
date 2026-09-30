import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { detectText } from "@/lib/detector";
import { MIN_DETECT_WORDS } from "@/lib/detector/types";
import { mergeDetections } from "@/lib/documents/merge";
import { MAX_DOCUMENT_CHARS, MAX_DOCUMENT_PARTS, normalizeDocumentText, splitDocument } from "@/lib/documents/split";
import type { Json } from "@/lib/supabase/database.types";
import { createClient, getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";
import { claimContents, getDailyUsage } from "@/lib/usage";
import { countWords } from "@/lib/utils";

export const maxDuration = 60;

const bodySchema = z.object({
  fileName: z.string().trim().min(1).max(120),
  text: z.string().max(MAX_DOCUMENT_CHARS + 2000),
  parts: z.number().int().min(1).max(MAX_DOCUMENT_PARTS).optional(),
  totalParts: z.number().int().min(1).max(10_000).optional(),
});

function error(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Checks a long document in parts. Each part uses one daily text; the parts are claimed all at once or not at all. */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return error("UNAUTHORIZED", "Please log in to use the AI detector.", 401);

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return error("INVALID_INPUT", "Upload a document to check.", 400);

  let text = normalizeDocumentText(parsed.data.text);
  if (countWords(text) < MIN_DETECT_WORDS) {
    return error("TEXT_TOO_SHORT", `The document needs at least ${MIN_DETECT_WORDS} words for a reliable result.`, 400);
  }

  const allRanges = splitDocument(text);
  const count = Math.min(parsed.data.parts ?? allRanges.length, allRanges.length, MAX_DOCUMENT_PARTS);
  const ranges = allRanges.slice(0, count);
  text = text.slice(0, ranges[count - 1].end);
  const partTexts = ranges.map((r) => text.slice(r.start, r.end));

  const allowed = await claimContents(partTexts).catch(() => false);
  if (!allowed) {
    const { contents } = await getDailyUsage();
    const left = Math.max(0, contents.limit - contents.used);
    return error(
      "DAILY_LIMIT",
      left === 0
        ? "You've used all your texts for today. Your limit resets at midnight UTC."
        : `This needs ${count} texts but you have ${left} left today. Check fewer parts, or come back after midnight UTC.`,
      429,
    );
  }

  const results = await Promise.all(partTexts.map((t) => detectText(t)));
  const totalParts = Math.max(allRanges.length, parsed.data.totalParts ?? 0);
  const result = mergeDetections(ranges, results, { fileName: parsed.data.fileName, totalParts });

  let checkId: string | null = null;
  const profile = await getCurrentProfile();
  if (profile?.save_history !== false) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("text_checks")
      .insert({
        user_id: user.id,
        kind: "detect",
        title: parsed.data.fileName,
        input_text: text,
        word_count: result.wordCount,
        ai_score_before: Number(result.aiProbability.toFixed(4)),
        engine: result.engine,
        result: result as unknown as Json,
      })
      .select("id")
      .single();
    checkId = data?.id ?? null;
  }

  return NextResponse.json({ ...result, text, checkId });
}
