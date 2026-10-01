import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { finishSignIn, safeNext } from "../finish";

// Links in auth emails land here. Verifying the token hash on the server works on any device,
// unlike the PKCE code flow, which needs the browser the request started in.
const TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];
const DEFAULT_NEXT: Partial<Record<EmailOtpType, string>> = { recovery: "/reset-password", email_change: "/dashboard/profile" };

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type && TYPES.includes(type)) {
    const next = safeNext(searchParams.get("next"), DEFAULT_NEXT[type] ?? "/dashboard");
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    // With secure email change, the first of the two links succeeds without returning a user.
    if (!error && type === "email_change") {
      return NextResponse.redirect(`${origin}${next}?emailChanged=${data.user ? "done" : "pending"}`);
    }
    if (!error && data.user) {
      return NextResponse.redirect(await finishSignIn(supabase, data.user, next, origin, "signup"));
    }
    const expired = error?.code === "otp_expired";
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(expired ? "That link has expired. Log in to get a new code." : "That link is invalid or was already used.")}`,
    );
  }

  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("That link is invalid or has expired.")}`);
}
