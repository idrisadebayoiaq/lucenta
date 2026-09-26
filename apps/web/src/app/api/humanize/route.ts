import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { humanize, HumanizerNotConfiguredError } from "@/lib/humanizer";
import { DAILY_CONTENT_LIMIT, MAX_TEXT_CHARS } from "@/lib/limits";
import { isLLMConfigured } from "@/lib/openai";
import { createClient, getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";
import { claimContent, registerDerivedContent } from "@/lib/usage";
import { countWords } from "@/lib/utils";

export const maxDuration = 120;

const bodySchema = z.object({
  text: z.string().max(100_000),
  tone: z.enum(["standard", "casual", "professional", "academic", "creative", "simple"]).default("standard"),
  strength: z.enum(["light", "balanced", "aggressive"]).default("balanced"),
  keepWords: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
});

function error(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET() {
  return NextResponse.json({ configured: isLLMConfigured() });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return error("UNAUTHORIZED", "Please log in to use the humanizer.", 401);

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return error("INVALID_INPUT", parsed.error.issues[0].message, 400);

  const { text: rawText, tone, strength, keepWords } = parsed.data;
  const text = rawText.trim();
  if (text.length > MAX_TEXT_CHARS) {
    return error("TEXT_TOO_LONG", `Texts can be up to ${MAX_TEXT_CHARS.toLocaleString()} characters. Yours has ${text.length.toLocaleString()}.`, 400);
  }
  const words = countWords(text);
  if (words < 20) return error("TEXT_TOO_SHORT", "Please enter at least 20 words to humanize.", 400);
  if (!isLLMConfigured()) {
    return error("NOT_CONFIGURED", "The humanizer engine isn't configured yet. Add OPENROUTER_API_KEY or OPENAI_API_KEY to enable it.", 503);
  }

  const allowed = await claimContent(text).catch(() => false);
  if (!allowed) {
    return error("DAILY_LIMIT", `You've used all ${DAILY_CONTENT_LIMIT} texts for today. You can still humanize texts you already checked today; new ones reset at midnight UTC.`, 429);
  }

  try {
    const result = await humanize(text, { tone, strength, keepWords });
    await registerDerivedContent(user.id, text, result.text).catch(() => undefined);

    let checkId: string | null = null;
    const profile = await getCurrentProfile();
    if (profile?.save_history !== false) {
      const supabase = await createClient();
      const { data } = await supabase
        .from("text_checks")
        .insert({
          user_id: user.id,
          kind: "humanize",
          title: text.slice(0, 80),
          input_text: text,
          output_text: result.text,
          word_count: words,
          ai_score_before: Number(result.aiScoreBefore.toFixed(4)),
          ai_score_after: Number(result.aiScoreAfter.toFixed(4)),
          similarity: Number(result.similarity.toFixed(4)),
          tone,
          strength,
          engine: result.engine,
        })
        .select("id")
        .single();
      checkId = data?.id ?? null;
    }

    return NextResponse.json({ ...result, checkId });
  } catch (e) {
    if (e instanceof HumanizerNotConfiguredError) return error("NOT_CONFIGURED", e.message, 503);
    return error("HUMANIZE_FAILED", e instanceof Error ? e.message : "Humanizing failed.", 500);
  }
}
