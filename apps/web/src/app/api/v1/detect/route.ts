import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, withApiKey } from "@/lib/api/handler";
import { detectionResult } from "@/lib/api/serialize";
import { detectText } from "@/lib/detector";
import { MIN_DETECT_WORDS } from "@/lib/detector/types";
import { DAILY_CONTENT_LIMIT, MAX_TEXT_CHARS } from "@/lib/limits";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { claimContentFor } from "@/lib/usage";
import { countWords } from "@/lib/utils";

const bodySchema = z.object({
  text: z.string({ error: "text is required." }).max(100_000),
  save: z.boolean().default(false),
});

/** AI-likelihood for a text, with sentence-level scores. `save: true` also adds it to your Lucenta history. */
export const POST = withApiKey(async (request, { userId }) => {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("INVALID_INPUT", parsed.error.issues[0].message, 400);

  const text = parsed.data.text.trim();
  if (text.length > MAX_TEXT_CHARS) {
    return apiError("TEXT_TOO_LONG", `Texts can be up to ${MAX_TEXT_CHARS.toLocaleString()} characters. Yours has ${text.length.toLocaleString()}.`, 400);
  }
  const words = countWords(text);
  if (words < MIN_DETECT_WORDS) return apiError("TEXT_TOO_SHORT", `Send at least ${MIN_DETECT_WORDS} words for a reliable result.`, 400);

  if (!(await claimContentFor(userId, text))) {
    return apiError("DAILY_LIMIT", `You've checked ${DAILY_CONTENT_LIMIT} different texts today. Your limit resets at midnight UTC.`, 429);
  }

  const result = await detectText(text);

  let id: string | null = null;
  if (parsed.data.save) {
    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("save_history").eq("id", userId).maybeSingle();
    if (profile?.save_history !== false) {
      const { data } = await admin
        .from("text_checks")
        .insert({
          user_id: userId,
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
      id = data?.id ?? null;
    }
  }

  return NextResponse.json({ id, ...detectionResult(result) });
});
