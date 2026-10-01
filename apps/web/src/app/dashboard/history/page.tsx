import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { textCheckAiScore, textCheckLabel } from "@/lib/text-checks";
import { cn } from "@/lib/utils";
import { HistoryList, type HistoryItem } from "./history-list";

export const metadata: Metadata = { title: "History" };

const TABS = [
  { id: "scans", label: "Website scans" },
  { id: "texts", label: "Text checks" },
] as const;

const FILTERS = [
  { id: "all", label: "All" },
  { id: "detect", label: "Detection" },
  { id: "suggest", label: "Suggestions" },
  { id: "humanize", label: "Rewrites" },
] as const;

export default async function HistoryPage({ searchParams }: PageProps<"/dashboard/history">) {
  const params = await searchParams;
  const tab = params.tab === "texts" ? "texts" : "scans";
  const filter = FILTERS.find((f) => f.id === params.filter)?.id ?? "all";
  const supabase = await createClient();

  let items: HistoryItem[] = [];
  if (tab === "scans") {
    const { data } = await supabase
      .from("scans")
      .select("id,url,device,status,overall_score,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    items = (data ?? []).map((s) => ({
      id: s.id,
      href: `/dashboard/analyzer/${s.id}`,
      title: s.url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
      subtitle: `${s.device} scan`,
      createdAt: s.created_at,
      score: s.status === "completed" && s.overall_score != null ? { value: s.overall_score, kind: "website" } : null,
      status: s.status,
    }));
  } else {
    let query = supabase
      .from("text_checks")
      .select("id,kind,title,word_count,ai_score_before,ai_score_after,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter !== "all") query = query.eq("kind", filter);
    const { data } = await query;
    items = (data ?? []).map((c) => {
      const score = textCheckAiScore(c);
      return {
        id: c.id,
        href: `/dashboard/history/${c.id}`,
        title: c.title || "Untitled text",
        subtitle: `${textCheckLabel(c.kind)} · ${c.word_count} words`,
        createdAt: c.created_at,
        score: score != null ? { value: Math.round(Number(score) * 100), kind: "ai" } : null,
      };
    });
  }

  return (
    <div>
      <PageHeader title="History" description="All your website scans and text checks in one place." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border p-1">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard/history?tab=${t.id}`}
              className={cn("rounded-md px-3 py-1.5 text-sm", tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {t.label}
            </Link>
          ))}
        </div>
        {tab === "texts" && (
          <div className="flex gap-1 text-sm">
            {FILTERS.map((f) => (
              <Link
                key={f.id}
                href={`/dashboard/history?tab=texts${f.id === "all" ? "" : `&filter=${f.id}`}`}
                className={cn("border-2 border-ink px-3 py-1", filter === f.id ? "border-primary text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                {f.label}
              </Link>
            ))}
          </div>
        )}
      </div>
      <Card>
        <CardContent className="pt-5">
          <HistoryList items={items} kind={tab === "scans" ? "scans" : "text_checks"} />
        </CardContent>
      </Card>
    </div>
  );
}
