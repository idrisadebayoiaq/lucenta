import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { detectText } from "@/lib/detector";
import { MIN_DETECT_WORDS } from "@/lib/detector/types";
import { DAILY_CONTENT_LIMIT, MAX_TEXT_CHARS } from "@/lib/limits";
import type { Json } from "@/lib/supabase/database.types";
import { createClient, getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";
import { claimContent, isDerivedContent } from "@/lib/usage";
import { countWords } from "@/lib/utils";

const bodySchema = z.object({ text: z.string().max(100_000), save: z.boolean().default(true) });

function error(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return error("UNAUTHORIZED", "Please log in to use the AI detector.", 401);

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return error("INVALID_INPUT", "Text is required.", 400);

  const text = parsed.data.text.trim();
  const derived = await isDerivedContent(user.id, text);
  if (text.length > MAX_TEXT_CHARS && !derived) {
    return error("TEXT_TOO_LONG", `Texts can be up to ${MAX_TEXT_CHARS.toLocaleString()} characters. Yours has ${text.length.toLocaleString()}.`, 400);
  }
  const words = countWords(text);
  if (words < (derived ? 20 : MIN_DETECT_WORDS)) return error("TEXT_TOO_SHORT", `Please enter at least ${MIN_DETECT_WORDS} words for a reliable result.`, 400);

  const allowed = await claimContent(text).catch(() => false);
  if (!allowed) {
    return error("DAILY_LIMIT", `You've checked ${DAILY_CONTENT_LIMIT} different texts today. Your limit resets at midnight UTC.`, 429);
  }

  const result = await detectText(text);

  let checkId: string | null = null;
  const profile = await getCurrentProfile();
  if (parsed.data.save && profile?.save_history !== false) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("text_checks")
      .insert({
        user_id: user.id,
        kind: "detect",
        title: text.slice(0, 80),
        input_text: text,
        word_count: words,
        ai_score_before: Number(result.aiProbability.toFixed(4)),
        engine: result.engine,
        result: result as unknown as Json,
      })
      .select("id")
      .single();
    checkId = data?.id ?? null;
  }

  return NextResponse.json({ ...result, checkId });
}
