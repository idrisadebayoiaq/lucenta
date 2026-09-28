import "server-only";
import { cache } from "react";
import type { Report } from "@/lib/analyzer/types";
import { createPublicClient } from "@/lib/supabase/public";

export type SharedReport = { url: string; device: string; createdAt: string; report: Report };

/** A report whose owner turned on its share link. Only found by the exact slug. */
export const getSharedReport = cache(async (slug: string): Promise<SharedReport | null> => {
  if (!/^[A-Za-z0-9]{16}$/.test(slug)) return null;
  const { data } = await createPublicClient().rpc("get_shared_report", { p_slug: slug });
  const row = data?.[0];
  if (!row) return null;
  return { url: row.url, device: row.device, createdAt: row.created_at, report: row.report as unknown as Report };
});
