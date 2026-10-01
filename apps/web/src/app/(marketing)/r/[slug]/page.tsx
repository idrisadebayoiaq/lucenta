import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportView } from "@/app/dashboard/analyzer/[id]/report-view";
import { SharedCta } from "@/components/shared-cta";
import { SharedHeader } from "@/components/shared-header";
import { displayUrl } from "@/lib/analyzer/compare";
import { getSharedReport } from "@/lib/reports/shared";

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
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:py-10">
      <SharedHeader
        label="Shared website report"
        title={displayUrl(shared.url)}
        href={shared.url}
        createdAt={shared.createdAt}
        device={shared.device}
        pdfUrl={`/api/shared/reports/${slug}/pdf`}
      />

      <ReportView report={report} />

      <SharedCta />
    </div>
  );
}
