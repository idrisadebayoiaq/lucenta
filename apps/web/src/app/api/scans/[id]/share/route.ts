import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { newShareSlug } from "@/lib/share";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

function error(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Turns the public share link on (new slug each time) or off (old link stops working). */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/scans/[id]/share">) {
  const user = await getCurrentUser();
  if (!user) return error("UNAUTHORIZED", "Please log in.", 401);

  const parsed = z.object({ enabled: z.boolean() }).safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return error("INVALID_INPUT", "Say whether sharing should be on or off.", 400);

  const { id } = await params;
  const supabase = await createClient();
  const { data: scan } = await supabase.from("scans").select("id,status").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!scan) return error("NOT_FOUND", "Scan not found.", 404);
  if (parsed.data.enabled && scan.status !== "completed") return error("NOT_READY", "Only finished reports can be shared.", 400);

  const shareSlug = parsed.data.enabled ? newShareSlug() : null;
  const { error: updateError } = await supabase
    .from("scans")
    .update({ is_public: parsed.data.enabled, share_slug: shareSlug })
    .eq("id", id)
    .eq("user_id", user.id);
  if (updateError) return error("DB_ERROR", updateError.message, 500);
  return NextResponse.json({ shareSlug });
}
