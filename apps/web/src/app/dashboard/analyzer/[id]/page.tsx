import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3, ExternalLink } from "lucide-react";
import { HireDeveloperCard } from "@/components/freelancer-card";
import { buttonVariants } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/misc";
import type { Report } from "@/lib/analyzer/types";
import { matchDevelopers } from "@/lib/freelancer-match";
import { getFreelancers } from "@/lib/freelancer-queries";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { ReportExport } from "./report-export";
import { ReportView } from "./report-view";
import { ScanActions } from "./scan-actions";

export const metadata: Metadata = { title: "Website report" };

export default async function ScanReportPage({ params }: PageProps<"/dashboard/analyzer/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: scan } = await supabase.from("scans").select("*, scan_results(report)").eq("id", id).maybeSingle();
  if (!scan) notFound();

  const result = Array.isArray(scan.scan_results) ? scan.scan_results[0] : scan.scan_results;
  const report = (result?.report ?? null) as Report | null;
  const displayUrl = scan.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const developers = matchDevelopers(report, await getFreelancers("developer"));

  return (
    <div className="space-y-6">
      <Link href="/dashboard/analyzer" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All scans
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {report?.page.favicon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={report.page.favicon} alt="" className="h-8 w-8 rounded" />
          )}
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 truncate text-2xl font-bold tracking-tight">
              {displayUrl}
              <a href={scan.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" aria-label="Open website">
                <ExternalLink className="h-4 w-4" />
              </a>
            </h1>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              {formatDateTime(scan.created_at)} <Badge tone="outline" className="capitalize">{scan.device}</Badge>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {report && (
            <Link
              href={`/dashboard/compare?url=${encodeURIComponent(scan.url)}&device=${scan.device}`}
              className={buttonVariants({ variant: "outline" })}
            >
              <BarChart3 className="h-4 w-4" /> Compare
            </Link>
          )}
          {report && scan.status === "completed" && <ReportExport scanId={scan.id} shareSlug={scan.is_public ? scan.share_slug : null} />}
          <ScanActions scanId={scan.id} url={scan.url} device={scan.device} />
        </div>
      </div>

      {scan.status === "failed" && (
        <Alert tone="danger" title="This scan failed">
          {scan.error ?? "Something went wrong while analyzing this website."}
        </Alert>
      )}
      {scan.status !== "failed" && !report && <Alert tone="info" title="This scan is still running. Refresh in a moment." />}
      {report && <ReportView report={report} />}
      {(report || scan.status === "failed") && (
        <HireDeveloperCard matches={developers} siteUrl={displayUrl} issueCount={report?.recommendations.length ?? 0} />
      )}
    </div>
  );
}
