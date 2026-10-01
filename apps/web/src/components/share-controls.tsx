"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Copy, Download, FileText, Link2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { shareUrl } from "@/lib/site";

function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

function Panel({ children, className = "w-64" }: { children: ReactNode; className?: string }) {
  return (
    <div role="menu" className={`absolute right-0 z-20 mt-2 brutal p-2 ${className}`}>
      {children}
    </div>
  );
}

export async function downloadPdf(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error?.message ?? "Could not create the PDF.");
      return false;
    }
    const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "lucenta-report.pdf";
    const href = URL.createObjectURL(await res.blob());
    Object.assign(document.createElement("a"), { href, download: name }).click();
    URL.revokeObjectURL(href);
    return true;
  } catch {
    toast.error("Network error. Please try again.");
    return false;
  }
}

/** `pdfUrl` is the owner's PDF endpoint; `?brand=white` is appended for the white-label version. */
export function PdfMenu({ pdfUrl }: { pdfUrl: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  async function download(whiteLabel: boolean) {
    setBusy(true);
    if (await downloadPdf(`${pdfUrl}${whiteLabel ? "?brand=white" : ""}`)) setOpen(false);
    setBusy(false);
  }

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" onClick={() => setOpen((o) => !o)} loading={busy} aria-haspopup="menu" aria-expanded={open}>
        {!busy && <Download className="h-4 w-4" />} PDF <ChevronDown className="h-4 w-4" />
      </Button>
      {open && (
        <Panel className="w-72">
          <button
            onClick={() => download(false)}
            disabled={busy}
            className="flex w-full cursor-pointer items-start gap-3 rounded-xl p-3 text-left hover:bg-muted disabled:opacity-50"
          >
            <FileText className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <span className="block text-sm font-bold">Download PDF</span>
              <span className="block text-xs text-muted-foreground">Everything on this page, with Lucenta branding.</span>
            </span>
          </button>
          <button
            onClick={() => download(true)}
            disabled={busy}
            className="flex w-full cursor-pointer items-start gap-3 rounded-xl p-3 text-left hover:bg-muted disabled:opacity-50"
          >
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <span className="block text-sm font-bold">White-label PDF</span>
              <span className="block text-xs text-muted-foreground">
                Your company name instead of Lucenta, for sending to clients. Set it in your{" "}
                <Link href="/dashboard/profile" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                  profile
                </Link>
                .
              </span>
            </span>
          </button>
        </Panel>
      )}
    </div>
  );
}

/** `publicPath` is the page prefix for the shared link, e.g. "/r/" or "/c/". */
export function ShareMenu({
  shareEndpoint,
  publicPath,
  initialSlug,
  what = "report",
}: {
  shareEndpoint: string;
  publicPath: string;
  initialSlug: string | null;
  what?: string;
}) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(initialSlug);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const link = slug && open ? shareUrl(`${publicPath}${slug}`) : "";

  async function setSharing(enabled: boolean) {
    setSaving(true);
    try {
      const res = await fetch(shareEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error?.message ?? "Could not update sharing.");
      setSlug(data.shareSlug);
      if (enabled && data.shareSlug) {
        await navigator.clipboard?.writeText(shareUrl(`${publicPath}${data.shareSlug}`)).catch(() => {});
        toast.success("Share link created and copied.");
      } else toast.success("Sharing turned off. The old link no longer works.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <Share2 className="h-4 w-4" /> Share
      </Button>
      {open && (
        <Panel className="w-80">
          <div className="space-y-3 p-2">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold">
                <Link2 className="h-4 w-4" /> Share link
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {slug
                  ? `Anyone with this link can see the full ${what} and download it as a PDF. They don't need an account or to log in.`
                  : `Create a read-only link to send this ${what} to a client or your team. Only people with the link can see it.`}
              </p>
            </div>
            {slug ? (
              <>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={link}
                    onFocus={(e) => e.target.select()}
                    className="h-9 min-w-0 flex-1 rounded-lg border bg-muted/40 px-2 text-xs"
                    aria-label="Share link"
                  />
                  <Button size="sm" className="h-9" onClick={copy}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <a href={link} target="_blank" rel="noreferrer" className="block text-center text-xs font-medium text-primary hover:underline">
                  Open the shared page
                </a>
                <Button variant="ghost" size="sm" className="w-full text-rose-500" onClick={() => setSharing(false)} loading={saving}>
                  Stop sharing
                </Button>
              </>
            ) : (
              <Button className="w-full" onClick={() => setSharing(true)} loading={saving}>
                Create share link
              </Button>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}

/** Download button for people viewing a shared page. */
export function SharedPdfButton({ pdfUrl }: { pdfUrl: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        await downloadPdf(pdfUrl);
        setBusy(false);
      }}
    >
      {!busy && <Download className="h-4 w-4" />} Download PDF
    </Button>
  );
}
