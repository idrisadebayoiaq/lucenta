import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { browserName, deviceType, isBot, normalizePath, referrerHost, visitorId } from "@/lib/analytics";
import { createAdminClient } from "@/lib/supabase/admin";

const eventSchema = z.discriminatedUnion("t", [
  z.object({ t: z.literal("pv"), p: z.string().max(2000), r: z.string().max(2000).optional() }),
  z.object({
    t: z.literal("wv"),
    p: z.string().max(2000),
    n: z.enum(["LCP", "INP", "CLS", "FCP", "TTFB"]),
    v: z.number().min(0).max(600_000),
    r: z.enum(["good", "needs-improvement", "poor"]),
  }),
]);

const done = () => new NextResponse(null, { status: 204 });

export async function POST(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";
  if (isBot(ua)) return done();

  const raw = await request.text();
  if (raw.length > 4000) return done();
  let event: z.infer<typeof eventSchema>;
  try {
    event = eventSchema.parse(JSON.parse(raw));
  } catch {
    return done();
  }

  const path = normalizePath(event.p);
  if (!path) return done();
  const device = deviceType(ua);
  const admin = createAdminClient();

  if (event.t === "wv") {
    await admin.from("web_vitals").insert({ path, name: event.n, value: event.v, rating: event.r, device });
    return done();
  }

  const ip = (request.headers.get("x-forwarded-for")?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "").trim();
  const country = request.headers.get("x-vercel-ip-country")?.toUpperCase();
  const day = new Date().toISOString().slice(0, 10);

  await admin.from("page_views").insert({
    path,
    referrer: referrerHost(event.r, request.headers.get("host")?.split(":")[0] ?? null),
    visitor: visitorId(ip, ua, day),
    country: country && /^[A-Z]{2}$/.test(country) ? country : null,
    device,
    browser: browserName(ua),
  });
  return done();
}
