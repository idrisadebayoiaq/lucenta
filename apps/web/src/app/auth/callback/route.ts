import { NextResponse, type NextRequest } from "next/server";
import {
  checkSignupAllowed,
  findQuotaOwner,
  getDeviceContext,
  hasRecordedDevice,
  linkQuota,
  recordDevice,
} from "@/lib/account-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const user = data.user;
      const device = await getDeviceContext();
      const isNewAccount =
        Date.now() - new Date(user.created_at).getTime() < NEW_ACCOUNT_WINDOW_MS && !(await hasRecordedDevice(user.id));

      if (isNewAccount) {
        const guard = await checkSignupAllowed(device, user.id);
        if (!guard.allowed) {
          await supabase.auth.signOut();
          await createAdminClient().auth.admin.deleteUser(user.id);
          return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(guard.message)}`);
        }
        const quotaOwner = await findQuotaOwner(device, user.id);
        await recordDevice(device, user.id, "google");
        if (quotaOwner) await linkQuota(user.id, quotaOwner);
      } else {
        await recordDevice(device, user.id, "login").catch((e) => console.error("Failed to record login device", e));
      }

      if (next !== "/reset-password") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("birth_date, occupation, referral_source")
          .eq("id", user.id)
          .single();
        if (!profile?.birth_date || !profile.occupation || !profile.referral_source) {
          return NextResponse.redirect(`${origin}/onboarding?next=${encodeURIComponent(next)}`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("That link is invalid or has expired.")}`);
}
