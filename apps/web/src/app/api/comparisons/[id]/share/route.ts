import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { newShareSlug } from "@/lib/share";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

function error(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Turns the comparison's public share link on (new slug each time) or off (old link stops working). */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/comparisons/[id]/share">) {
  const user = await getCurrentUser();
  if (!user) return error("UNAUTHORIZED", "Please log in.", 401);

  const parsed = z.object({ enabled: z.boolean() }).safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return error("INVALID_INPUT", "Say whether sharing should be on or off.", 400);

  const { id } = await params;
  const supabase = await createClient();
  const shareSlug = parsed.data.enabled ? newShareSlug() : null;
  const { data, error: updateError } = await supabase
    .from("comparisons")
    .update({ is_public: parsed.data.enabled, share_slug: shareSlug })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");
  if (updateError) return error("DB_ERROR", updateError.message, 500);
  if (!data?.length) return error("NOT_FOUND", "Comparison not found.", 404);
  return NextResponse.json({ shareSlug });
}
