import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Gauge, HeartHandshake, ShieldCheck } from "lucide-react";
import { AuthCta } from "@/components/auth-state";

export const metadata: Metadata = {
  title: "About",
  description: "Why we built Lucenta and how it works.",
};

export const revalidate = 3600;

const VALUES = [
  { icon: Eye, title: "Clear, not clever", body: "Every score comes with the reasons behind it and plain-English steps to fix it." },
  { icon: HeartHandshake, title: "Free to start", body: "Everyone gets daily audits and text checks at no cost. No card, no trial timer." },
  { icon: ShieldCheck, title: "Private by default", body: "Your text is only stored if you keep history on, and you can delete everything at any time." },
  { icon: Gauge, title: "Fast and practical", body: "Reports in under a minute, fixes ordered by impact so you know what to do first." },
];

export default function AboutPage() {
  return (
    <>
      <section className="border-b">
        <div className="mx-auto max-w-3xl px-4 py-16 md:py-20">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">About Lucenta</h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Lucenta helps business owners, creators, students and marketers check what they publish before the world sees it. Most
            people can&apos;t tell why their website isn&apos;t getting customers, or whether their writing sounds like a robot. The
            tools that tell you are usually expensive, technical, or both.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            So we built one place that audits your website&apos;s speed, SEO, security, accessibility and content with the help of
            AI, detects AI-written text sentence by sentence, and rewrites it so it sounds naturally human. And we made it free
            to start.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-extrabold tracking-tight">What we believe</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border p-5">
              <Icon className="h-6 w-6 text-primary" />
              <p className="mt-3 font-bold">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="text-2xl font-extrabold tracking-tight">Help from real developers</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Not everyone wants to fix their own website. Every report can be handed to an independent developer listed on
            Lucenta, who you contact directly on WhatsApp, by phone or email. Soon, developers will be able to create their own
            profiles and get suggested based on how well they can fix the issues in your report.
          </p>
          <Link href="/developers" className="mt-5 inline-block text-sm font-bold text-primary hover:underline">
            Browse developers →
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight">See it for yourself</h2>
        <p className="mt-3 text-muted-foreground">Run your first website audit in under a minute.</p>
        <AuthCta className="mt-8" />
      </section>
    </>
  );
}
