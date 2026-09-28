import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { ReportView } from "@/app/dashboard/analyzer/[id]/report-view";
import { SharedPdfButton } from "@/components/share-controls";
import { SharedCta } from "@/components/shared-cta";
import { Badge } from "@/components/ui/misc";
import { displayUrl } from "@/lib/analyzer/compare";
import { getSharedReport } from "@/lib/reports/shared";
import { formatDate } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/r/[slug]">): Promise<Metadata> {
  const shared = await getSharedReport((await params).slug);
  if (!shared) return { title: "Report not found", robots: { index: false, follow: false } };
  const site = displayUrl(shared.url);
  const title = `Website report: ${site} scored ${shared.report.overall.score}/100`;
  const description = `Grade ${shared.report.overall.grade}. ${shared.report.recommendations.length} recommended fixes across performance, SEO, accessibility, security and content. View the full report, no account needed.`;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "article", siteName: "Lucenta" },
    twitter: { card: "summary", title, description },
  };
}

export default async function SharedReportPage({ params }: PageProps<"/r/[slug]">) {
  const { slug } = await params;
  const shared = await getSharedReport(slug);
  if (!shared) notFound();
  const { report } = shared;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {report.page.favicon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={report.page.favicon} alt="" className="h-8 w-8 rounded" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">Shared website report</p>
            <h1 className="flex items-center gap-2 truncate text-2xl font-bold tracking-tight">
              {displayUrl(shared.url)}
              <a href={shared.url} target="_blank" rel="noreferrer nofollow" className="text-muted-foreground hover:text-foreground" aria-label="Open website">
                <ExternalLink className="h-4 w-4" />
              </a>
            </h1>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              {formatDate(shared.createdAt)} <Badge tone="outline" className="capitalize">{shared.device}</Badge>
            </p>
          </div>
        </div>
        <SharedPdfButton pdfUrl={`/api/shared/reports/${slug}/pdf`} />
      </div>

      <ReportView report={report} />

      <SharedCta />
    </div>
  );
}
