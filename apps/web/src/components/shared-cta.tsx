import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Shown at the bottom of shared report and comparison pages. */
export function SharedCta() {
  return (
    <div className="rounded-2xl border bg-muted/40 p-8 text-center">
      <h2 className="text-2xl font-extrabold tracking-tight">Want a report like this for your site?</h2>
      <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
        Lucenta runs 50+ checks on performance, SEO, accessibility and security, then tells you exactly what to fix. You can also compare your site
        with competitors. It&apos;s free.
      </p>
      <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "mt-6")}>
        Audit your website free
      </Link>
    </div>
  );
}
