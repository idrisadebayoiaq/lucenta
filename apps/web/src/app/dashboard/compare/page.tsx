import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, EmptyState } from "@/components/ui/misc";
import { displayUrl } from "@/lib/analyzer/compare";
import { createClient } from "@/lib/supabase/server";
import { getDailyUsage } from "@/lib/usage";
import { cn, formatDateTime, scoreColor } from "@/lib/utils";
import { CompareForm } from "./compare-form";

export const metadata: Metadata = { title: "Competitor comparison" };

export default async function ComparePage({ searchParams }: PageProps<"/dashboard/compare">) {
  const params = await searchParams;
  const initialUrl = typeof params.url === "string" ? params.url : "";
  const initialDevice = params.device === "desktop" ? "desktop" : "mobile";

  const supabase = await createClient();
  const [{ data: comparisons }, usage] = await Promise.all([
    supabase.from("comparisons").select("id,site_url,device,created_at").order("created_at", { ascending: false }).limit(20),
    getDailyUsage(),
  ]);

  const ids = (comparisons ?? []).map((c) => c.id);
  const { data: sites } = ids.length
    ? await supabase.from("comparison_sites").select("comparison_id,position,url,scan_id").in("comparison_id", ids)
    : { data: [] };
  const scanIds = (sites ?? []).flatMap((s) => (s.scan_id ? [s.scan_id] : []));
  const { data: scans } = scanIds.length
    ? await supabase.from("scans").select("id,status,overall_score").in("id", scanIds)
    : { data: [] };
  const scoreByScan = new Map((scans ?? []).map((s) => [s.id, s.status === "completed" ? s.overall_score : null]));

  const rows = (comparisons ?? []).map((c) => {
    const members = (sites ?? []).filter((s) => s.comparison_id === c.id).sort((a, b) => a.position - b.position);
    const scores = members.map((m) => (m.scan_id ? (scoreByScan.get(m.scan_id) ?? null) : null));
    const yours = scores[0];
    const rank = yours == null ? null : 1 + scores.slice(1).filter((s) => s != null && s > yours).length;
    return { ...c, competitors: members.slice(1).map((m) => displayUrl(m.url)), yours, rank, total: members.length };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Competitor comparison"
        description="Scan your site next to up to 3 competitors and see exactly where they beat you, and what to fix first."
      />
      <CompareForm initialUrl={initialUrl} initialDevice={initialDevice} scansLeft={Math.max(0, usage.scans.limit - usage.scans.used)} />

      <Card>
        <CardHeader>
          <CardTitle>Your comparisons</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 font-medium">Your site</th>
                    <th className="py-2 font-medium">Competitors</th>
                    <th className="py-2 font-medium">Date</th>
                    <th className="py-2 text-right font-medium">Your rank</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/50">
                      <td className="py-3">
                        <Link href={`/dashboard/compare/${r.id}`} className="font-medium hover:text-primary">
                          {displayUrl(r.site_url)}
                        </Link>
                        <span className="ml-2 text-xs capitalize text-muted-foreground">{r.device}</span>
                      </td>
                      <td className="max-w-64 truncate py-3 text-muted-foreground">{r.competitors.join(", ")}</td>
                      <td className="py-3 text-muted-foreground">{formatDateTime(r.created_at)}</td>
                      <td className="py-3 text-right">
                        {r.rank != null && r.yours != null ? (
                          <span className="font-bold">
                            #{r.rank} <span className="text-xs text-muted-foreground">of {r.total}</span>{" "}
                            <span className={cn("text-xs", scoreColor(r.yours))}>({r.yours})</span>
                          </span>
                        ) : (
                          <Badge tone="outline">Scan deleted</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<BarChart3 className="h-8 w-8" />}
              title="No comparisons yet"
              description="Add your site and a competitor above to see how you stack up."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
