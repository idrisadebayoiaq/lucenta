import type { Metadata } from "next";
import Link from "next/link";
import { Globe } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, EmptyState } from "@/components/ui/misc";
import { createClient } from "@/lib/supabase/server";
import { cn, formatDateTime, scoreColor } from "@/lib/utils";
import { ScanForm } from "./scan-form";

export const metadata: Metadata = { title: "Website Analyzer" };

export default async function AnalyzerPage({ searchParams }: PageProps<"/dashboard/analyzer">) {
  const params = await searchParams;
  const initialUrl = typeof params.url === "string" ? params.url : "";
  const supabase = await createClient();
  const { data: scans } = await supabase
    .from("scans")
    .select("id,url,device,status,overall_score,grade,created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Website Analyzer"
        description="Check performance, SEO, accessibility, security and more — then get a prioritized list of fixes."
      />
      <ScanForm initialUrl={initialUrl} autoStart={!!initialUrl} />

      <Card>
        <CardHeader>
          <CardTitle>Recent scans</CardTitle>
        </CardHeader>
        <CardContent>
          {scans && scans.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 font-medium">Website</th>
                    <th className="py-2 font-medium">Device</th>
                    <th className="py-2 font-medium">Date</th>
                    <th className="py-2 text-right font-medium">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {scans.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/50">
                      <td className="py-3">
                        <Link href={`/dashboard/analyzer/${s.id}`} className="font-medium hover:text-primary">
                          {s.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </Link>
                      </td>
                      <td className="py-3 capitalize text-muted-foreground">{s.device}</td>
                      <td className="py-3 text-muted-foreground">{formatDateTime(s.created_at)}</td>
                      <td className="py-3 text-right">
                        {s.status === "completed" && s.overall_score != null ? (
                          <span className={cn("font-bold", scoreColor(s.overall_score))}>
                            {s.overall_score} <span className="text-xs text-muted-foreground">({s.grade})</span>
                          </span>
                        ) : (
                          <Badge tone={s.status === "failed" ? "danger" : "info"} className="capitalize">
                            {s.status}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={<Globe className="h-8 w-8" />} title="No scans yet" description="Enter a URL above to run your first audit." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
