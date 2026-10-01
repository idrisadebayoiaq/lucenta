import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComparisonView } from "@/app/dashboard/compare/[id]/comparison-view";
import { SharedCta } from "@/components/shared-cta";
import { SharedHeader } from "@/components/shared-header";
import { displayUrl } from "@/lib/analyzer/compare";
import { summarizeComparison } from "@/lib/comparisons/data";
import { getSharedComparison } from "@/lib/comparisons/load";

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
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:py-10">
      <SharedHeader
        label="Shared competitor comparison"
        title={displayUrl(data.siteUrl)}
        subtitle={`vs ${rivals} competitor${rivals === 1 ? "" : "s"}`}
        href={data.siteUrl}
        createdAt={data.createdAt}
        device={data.device}
        pdfUrl={`/api/shared/comparisons/${slug}/pdf`}
      />

      <ComparisonView data={data} />

      <SharedCta />
    </div>
  );
}
