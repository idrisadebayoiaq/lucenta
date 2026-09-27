import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { DAILY_CONTENT_LIMIT, MAX_TEXT_CHARS } from "@/lib/limits";
import { suggestImprovements } from "@/lib/suggestions";
import type { Json } from "@/lib/supabase/database.types";
import { createClient, getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";
import { claimContent } from "@/lib/usage";
import { countWords } from "@/lib/utils";

export const maxDuration = 60;

const bodySchema = z.object({ text: z.string().max(100_000) });

function error(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return error("UNAUTHORIZED", "Please log in to get writing suggestions.", 401);

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return error("INVALID_INPUT", "Text is required.", 400);

  const text = parsed.data.text.trim();
  if (text.length > MAX_TEXT_CHARS) {
    return error("TEXT_TOO_LONG", `Texts can be up to ${MAX_TEXT_CHARS.toLocaleString()} characters. Yours has ${text.length.toLocaleString()}.`, 400);
  }
  const words = countWords(text);
  if (words < 20) return error("TEXT_TOO_SHORT", "Please enter at least 20 words to get suggestions.", 400);

  const allowed = await claimContent(text).catch(() => false);
  if (!allowed) {
    return error("DAILY_LIMIT", `You've used all ${DAILY_CONTENT_LIMIT} texts for today. Your limit resets at midnight UTC.`, 429);
  }

  const result = await suggestImprovements(text);

  let checkId: string | null = null;
  const profile = await getCurrentProfile();
  if (profile?.save_history !== false) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("text_checks")
      .insert({
        user_id: user.id,
        kind: "suggest",
        title: text.slice(0, 80),
        input_text: text,
        word_count: words,
        engine: result.engine,
        result: result as unknown as Json,
      })
      .select("id")
      .single();
    checkId = data?.id ?? null;
  }

  return NextResponse.json({ ...result, checkId });
}
