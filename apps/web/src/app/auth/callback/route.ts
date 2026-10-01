import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { finishSignIn, safeNext } from "../finish";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) return NextResponse.redirect(await finishSignIn(supabase, data.user, next, origin, "google"));
  }

  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("That link is invalid or has expired.")}`);
}
