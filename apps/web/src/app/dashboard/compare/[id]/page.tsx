import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PdfMenu, ShareMenu } from "@/components/share-controls";
import { Badge } from "@/components/ui/misc";
import { displayUrl } from "@/lib/analyzer/compare";
import { loadOwnComparison } from "@/lib/comparisons/load";
import { formatDateTime } from "@/lib/utils";
import { CompareActions } from "./compare-actions";
import { ComparisonView } from "./comparison-view";

export const metadata: Metadata = { title: "Competitor comparison" };

export default async function ComparisonPage({ params }: PageProps<"/dashboard/compare/[id]">) {
  const { id } = await params;
  const loaded = await loadOwnComparison(id);
  if (!loaded) notFound();
  const { comparison, data } = loaded;
  const rivals = data.sites.length - 1;
  const hasReport = !!data.sites[0]?.report;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/compare" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All comparisons
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">
            {displayUrl(data.siteUrl)} <span className="font-normal text-muted-foreground">vs {rivals} competitor{rivals === 1 ? "" : "s"}</span>
          </h1>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            {formatDateTime(data.createdAt)} <Badge tone="outline" className="capitalize">{data.device}</Badge>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasReport && (
            <>
              <ShareMenu
                shareEndpoint={`/api/comparisons/${comparison.id}/share`}
                publicPath="/c/"
                initialSlug={comparison.is_public ? comparison.share_slug : null}
                what="comparison"
              />
              <PdfMenu pdfUrl={`/api/comparisons/${comparison.id}/pdf`} />
            </>
          )}
          <CompareActions comparisonId={comparison.id} urls={data.sites.map((s) => s.url)} device={data.device} />
        </div>
      </div>

      <ComparisonView data={data} siteHref={(s) => (s.scanId ? `/dashboard/analyzer/${s.scanId}` : null)} />
    </div>
  );
}
