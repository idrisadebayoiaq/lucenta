import type { ReactNode } from "react";
import { CalendarDays, ExternalLink, Monitor, Smartphone } from "lucide-react";
import { SharedPdfButton } from "@/components/share-controls";
import { formatDate } from "@/lib/utils";

/** Top card on the public shared report and comparison pages. */
export function SharedHeader({
  label,
  title,
  subtitle,
  href,
  createdAt,
  device,
  pdfUrl,
}: {
  label: string;
  title: string;
  subtitle?: ReactNode;
  href?: string;
  createdAt: string;
  device: string;
  pdfUrl: string;
}) {
  const DeviceIcon = device === "mobile" ? Smartphone : Monitor;
  return (
    <div className="brutal border-t-8 border-t-primary p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span className="chip">{label}</span>
          <h1 className="mt-3 flex min-w-0 items-center gap-2 text-2xl font-black uppercase leading-tight sm:text-3xl">
            <span className="truncate">{title}</span>
            {href && (
              <a
                href={href}
                target="_blank"
                rel="noreferrer nofollow"
                className="shrink-0 text-muted-foreground hover:text-primary"
                aria-label="Open website"
              >
                <ExternalLink className="h-5 w-5" />
              </a>
            )}
          </h1>
          {subtitle && <p className="mt-1 font-semibold text-muted-foreground">{subtitle}</p>}
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" /> {formatDate(createdAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <DeviceIcon className="h-3.5 w-3.5" /> {device}
            </span>
          </p>
        </div>
        <div className="shrink-0">
          <SharedPdfButton pdfUrl={pdfUrl} />
        </div>
      </div>
    </div>
  );
}
