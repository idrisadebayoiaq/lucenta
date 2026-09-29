import { NextResponse } from "next/server";
import { RATE_LIMIT_PER_MINUTE, withApiKey } from "@/lib/api/handler";
import { getDailyUsageFor, utcToday } from "@/lib/usage";

/** Today's audits and texts left. Shared with the account's use of the Lucenta dashboard. */
export const GET = withApiKey(async (_request, { userId }) => {
  const { scans, contents } = await getDailyUsageFor(userId);
  const resetsAt = new Date(`${utcToday()}T00:00:00Z`);
  resetsAt.setUTCDate(resetsAt.getUTCDate() + 1);
  return NextResponse.json({
    day: utcToday(),
    resets_at: resetsAt.toISOString(),
    audits: { used: scans.used, limit: scans.limit, remaining: Math.max(0, scans.limit - scans.used) },
    texts: { used: contents.used, limit: contents.limit, remaining: Math.max(0, contents.limit - contents.used) },
    rate_limit_per_minute: RATE_LIMIT_PER_MINUTE,
  });
});
