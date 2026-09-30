"use client";

import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { useEffect, useRef } from "react";

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];

const ENABLED = process.env.NODE_ENV === "production";
const VITALS = new Set(["LCP", "INP", "CLS", "FCP", "TTFB"]);

function send(event: Record<string, unknown>) {
  if (!ENABLED) return;
  const body = JSON.stringify(event);
  if (navigator.sendBeacon?.("/api/analytics", body)) return;
  fetch("/api/analytics", { method: "POST", body, keepalive: true }).catch(() => {});
}

const reportVital: ReportWebVitalsCallback = (metric) => {
  if (!VITALS.has(metric.name)) return;
  send({ t: "wv", p: location.pathname, n: metric.name, v: metric.value, r: metric.rating });
};

/** Anonymous page views and real-user performance for the admin dashboard. No cookies. */
export function Analytics() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    send({ t: "pv", p: pathname, r: first.current ? document.referrer : undefined });
    first.current = false;
  }, [pathname]);

  useReportWebVitals(reportVital);
  return null;
}
