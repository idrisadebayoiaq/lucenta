import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComparisonView } from "@/app/dashboard/compare/[id]/comparison-view";
import { SharedPdfButton } from "@/components/share-controls";
import { SharedCta } from "@/components/shared-cta";
import { Badge } from "@/components/ui/misc";
import { displayUrl } from "@/lib/analyzer/compare";
import { summarizeComparison } from "@/lib/comparisons/data";
import { getSharedComparison } from "@/lib/comparisons/load";
import { formatDate } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/c/[slug]">): Promise<Metadata> {
  const data = await getSharedComparison((await params).slug);
  if (!data) return { title: "Comparison not found", robots: { index: false, follow: false } };
  const site = displayUrl(data.siteUrl);
  const { result } = summarizeComparison(data);
  const rivals = data.sites.slice(1).map((s) => displayUrl(s.url));
  const title = `${site} vs ${rivals.join(", ")}`;
  const description = result
    ? `${site} ranks #${result.rank} of ${result.total}. See the side-by-side scores, quick wins and where competitors do better. No account needed.`
    : `A website comparison made with Lucenta. No account needed.`;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "article", siteName: "Lucenta" },
    twitter: { card: "summary", title, description },
  };
}

export default async function SharedComparisonPage({ params }: PageProps<"/c/[slug]">) {
  const { slug } = await params;
  const data = await getSharedComparison(slug);
  if (!data) notFound();
  const rivals = data.sites.length - 1;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">Shared competitor comparison</p>
          <h1 className="truncate text-2xl font-bold tracking-tight">
            {displayUrl(data.siteUrl)} <span className="font-normal text-muted-foreground">vs {rivals} competitor{rivals === 1 ? "" : "s"}</span>
          </h1>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            {formatDate(data.createdAt)} <Badge tone="outline" className="capitalize">{data.device}</Badge>
          </p>
        </div>
        <SharedPdfButton pdfUrl={`/api/shared/comparisons/${slug}/pdf`} />
      </div>

      <ComparisonView data={data} />

      <SharedCta />
    </div>
  );
}
