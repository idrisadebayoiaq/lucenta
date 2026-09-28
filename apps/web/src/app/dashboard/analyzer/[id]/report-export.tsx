import { PdfMenu, ShareMenu } from "@/components/share-controls";

export function ReportExport({ scanId, shareSlug }: { scanId: string; shareSlug: string | null }) {
  return (
    <>
      <ShareMenu shareEndpoint={`/api/scans/${scanId}/share`} publicPath="/r/" initialSlug={shareSlug} what="report" />
      <PdfMenu pdfUrl={`/api/scans/${scanId}/pdf`} />
    </>
  );
}
