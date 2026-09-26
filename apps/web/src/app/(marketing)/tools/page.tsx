import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { AuthCta } from "@/components/auth-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { FREE_FEATURES } from "@/lib/limits";
import { AVAILABLE_TOOLS, COMING_SOON_TOOLS } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Tools",
  description: "Website Analyzer, AI Text Detector, Humanizer and more — everything Lucenta can do today and what's coming next.",
};

export default function ToolsPage() {
  return (
    <>
      <section className="border-b">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center md:py-20">
          <Badge className="mb-5">Free for everyone</Badge>
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Everything you need to check what you publish</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Audit your website, detect AI-written text and make your writing sound human — all in one dashboard.
          </p>
          <nav className="mt-8 flex flex-wrap justify-center gap-2">
            {AVAILABLE_TOOLS.map((t) => (
              <a key={t.slug} href={`#${t.slug}`} className="rounded-full border px-4 py-2 text-sm font-bold transition-colors hover:bg-muted">
                {t.title}
              </a>
            ))}
            <a href="#coming-soon" className="rounded-full border px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted">
              Coming soon
            </a>
          </nav>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-6 px-4 py-16">
        {AVAILABLE_TOOLS.map(({ slug, icon: Icon, title, tagline, description, features, href }) => (
          <Card key={slug} id={slug} className="scroll-mt-24">
            <CardContent className="grid gap-8 pt-6 md:grid-cols-[1fr_1fr] md:p-8">
              <div>
                <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </span>
                <h2 className="mt-4 text-2xl font-extrabold tracking-tight">{title}</h2>
                <p className="mt-1 font-medium">{tagline}</p>
                <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{description}</p>
                {href && (
                  <AuthCta
                    size="md"
                    className="mt-6"
                    signedOutHref={href.startsWith("/dashboard") ? "/signup" : href}
                    signedOutLabel={href.startsWith("/dashboard") ? `Sign up to use ${title}` : `Meet the developers`}
                    signedInHref={href}
                    signedInLabel={href.startsWith("/dashboard") ? `Open ${title}` : `Meet the developers`}
                  />
                )}
              </div>
              <ul className="space-y-3 self-center">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[15px]">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </section>

      <section id="coming-soon" className="scroll-mt-16 border-y">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-extrabold tracking-tight">Coming soon</h2>
            <p className="mt-3 text-muted-foreground">
              Here&apos;s what we&apos;re building next. Everyone with a free account gets new tools as soon as they launch.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {COMING_SOON_TOOLS.map(({ slug, icon: Icon, title, tagline, description, features }) => (
              <div key={slug} id={slug} className="scroll-mt-24 rounded-2xl border p-6">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-muted">
                    <Icon className="h-5 w-5" />
                  </span>
                  <Badge tone="outline">Coming soon</Badge>
                </div>
                <h3 className="mt-4 text-lg font-bold">{title}</h3>
                <p className="text-sm font-medium">{tagline}</p>
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                <ul className="mt-4 space-y-1.5">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid items-center gap-10 rounded-2xl border p-8 md:grid-cols-2 md:p-12">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Start free today</h2>
            <p className="mt-3 text-muted-foreground">No credit card. Your limits reset every day at midnight UTC.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <AuthCta />
              <Link href="/#faq" className="inline-flex items-center gap-1 px-2 text-sm font-bold text-primary hover:underline">
                Read the FAQ <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <ul className="space-y-3">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3 text-[15px]">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> {f}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
