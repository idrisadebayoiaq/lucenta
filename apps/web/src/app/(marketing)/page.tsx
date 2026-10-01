import Link from "next/link";
import {
  Accessibility,
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  Code2,
  FileText,
  Gauge,
  Globe,
  PenLine,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wand2,
} from "lucide-react";
import { AuthCta } from "@/components/auth-state";
import { FreelancerListCard } from "@/components/freelancer-card";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, ScoreRing } from "@/components/ui/misc";
import { getFreelancers } from "@/lib/freelancer-queries";
import { FREE_FEATURES } from "@/lib/limits";
import { COMING_SOON_TOOLS } from "@/lib/tools";
import { HeroForm } from "./hero-form";

// Static page, re-generated at most once an hour (freelancer saves also revalidate it).
export const revalidate = 3600;

const TOOLS = [
  {
    icon: Globe,
    title: "Website Analyzer",
    href: "/tools#website-analyzer",
    description: "Speed, SEO, accessibility, security and mobile checks, reviewed by AI and turned into a prioritized list of fixes.",
    points: ["AI review of your content and UX", "What your site is missing", "Step-by-step fixes"],
  },
  {
    icon: BarChart3,
    title: "Competitor comparison",
    href: "/tools#competitor-comparison",
    description: "Scan your site next to up to 3 competitors and see exactly which checks they pass that you don't.",
    points: ["Side-by-side scores and ranking", "Gaps and quick wins", "Re-run to track changes"],
  },
  {
    icon: FileText,
    title: "PDF reports & share links",
    href: "/tools#pdf-reports",
    description: "Download any report as a clean PDF or send a private read-only link. No account needed to open it.",
    points: ["Printable PDF reports", "Private share links you can turn off", "White-label PDFs for agencies"],
  },
  {
    icon: Bot,
    title: "AI Text Detector",
    href: "/tools#ai-detector",
    description: "See how likely text is to be AI-generated, with sentence-level highlights and the reasons why. Paste text or upload a document.",
    points: ["Sentence highlights", "Upload .docx, .pdf or .txt", "PDF report of every check"],
  },
  {
    icon: Wand2,
    title: "Rewriter",
    href: "/tools#rewriter",
    description: "Get feedback on what to improve, or polish stiff, wordy text while keeping your meaning, names and numbers.",
    points: ["Sentence-by-sentence suggestions", "Multiple tones", "Meaning preserved"],
  },
  {
    icon: Code2,
    title: "Developer API",
    href: "/tools#api",
    description: "Run website audits and AI detection from your own website, app or scripts with a simple REST API.",
    points: ["Full audit reports as JSON", "Signed webhooks", "API keys and usage dashboard"],
  },
];

const CHECKS = [
  { icon: Gauge, label: "Performance" },
  { icon: Search, label: "SEO" },
  { icon: Accessibility, label: "Accessibility" },
  { icon: ShieldCheck, label: "Security" },
  { icon: Smartphone, label: "Mobile" },
  { icon: PenLine, label: "Content" },
];

const STEPS = [
  { title: "Paste a URL or text", body: "Drop in your website address or the content you want to check." },
  { title: "Get a clear report", body: "Scores, metrics, and highlights that explain exactly what's going on." },
  { title: "Fix it or get help", body: "Follow the prioritized fixes, get writing suggestions in one click, or hand the report to a developer." },
];

const FAQ = [
  {
    q: "What does the website analyzer check?",
    a: "Page speed signals (response time, page weight, requests, render-blocking resources), on-page and technical SEO, accessibility, security headers and HTTPS, mobile-friendliness, and the technology your site uses. An AI model then reviews your content, structure and calls-to-action and adds its own suggestions.",
  },
  {
    q: "Is Lucenta really free?",
    a: "Yes. Every account gets 5 website audits and 5 texts (up to 3,000 characters each) per day for the AI Detector and Rewriter. Limits reset every day at midnight UTC.",
  },
  {
    q: "How accurate is the AI detector?",
    a: "AI detection is probabilistic. We show a confidence level and highlight the sentences driving the score. Human writing can be flagged and AI writing can be missed, so treat the score as a starting point for a conversation, never as the only evidence that someone cheated.",
  },
  {
    q: "What's the difference between Rewrite and Suggestions?",
    a: "Rewrite mode turns stiff, robotic text into natural writing for you, in the tone you choose. Suggestions mode doesn't change your text at all: it highlights sentences that sound robotic, unclear or wordy, explains why, and tells you how to fix them yourself.",
  },
  {
    q: "Will the Rewriter change my meaning?",
    a: "No. Rewrite mode keeps names, numbers, quotes, and your key points intact, and checks that the rewrite still says the same thing. You can also give it a list of words it must never change.",
  },
  {
    q: "Can I use Lucenta for school work?",
    a: "Yes, to improve your own writing. Students can use the AI Detector and Website Analyzer as normal, and the Rewriter's Suggestions mode to learn what to fix. Lucenta is not a cheating tool: don't use it to submit AI-written work where your school forbids it, to hide AI use you're required to disclose, or to pass off someone else's work as yours. Always follow your institution's rules, and see our Responsible Use Policy for details.",
  },
  {
    q: "Why can't students use Rewrite mode?",
    a: "To support academic integrity. Instead of writing the work for you, Suggestions mode shows you exactly which sentences to improve and why, so the writing stays yours and you get better at it. If your occupation changes, you can update it in Settings (occupation can be changed once every 30 days).",
  },
  {
    q: "Why do you ask for my occupation and date of birth?",
    a: "Lucenta is for people aged 16 and over, so we check your date of birth once at sign-up and never show it publicly. Your occupation decides which Rewriter modes you get, and \"how you heard about us\" helps us understand where people find Lucenta. See our Privacy Policy for details.",
  },
  {
    q: "Can I create more than one account?",
    a: "No. Each person can have one account, and only one account can be created per device. This keeps the free daily limits fair for everyone.",
  },
  {
    q: "Can someone fix my website or help with my writing?",
    a: "Yes. Every website report suggests developers whose skills match the issues found, and if you're not happy with a writing result, Lucenta suggests writers who specialise in that kind of content (SEO articles, copy, books, scripts and more). You contact them directly on WhatsApp, by phone or email. Lucenta doesn't take a cut, so agree on the price and scope with them. Writer suggestions aren't shown on student accounts.",
  },
  {
    q: "How do I get listed as a developer or writer?",
    a: "Sign in, open Freelancer profile in your dashboard and fill in your details: photo, bio, specialties, services, portfolio gallery and contact details. Your profile goes live straight away, and your specialties decide which reports and writing results suggest you. You need to be 18 or older, and writers must never do graded work for students.",
  },
  {
    q: "Do you store my text?",
    a: "Only if you keep history turned on. You can turn it off or delete all your data at any time in settings.",
  },
];

export default async function HomePage() {
  const all = await getFreelancers();
  const featured = [...all].sort((a, b) => Number(b.is_verified) - Number(a.is_verified)).slice(0, 3);

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_80%)]" />
        <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-16 text-center md:pt-28">
          <span className="chip mb-8 shadow-brutal-xs">
            <Sparkles className="h-3 w-3 text-primary" /> 100% free · AI website audits + writing tools
          </span>
          <h1 className="mx-auto max-w-4xl text-4xl font-black uppercase leading-[1.05] tracking-tight md:text-6xl">
            See what your website is missing.{" "}
            <span className="box-decoration-clone bg-primary px-2 leading-[1.25] text-white">Make your writing clearer.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Lucenta audits your site&apos;s speed, SEO, security and accessibility with AI, checks text for signs of AI writing,
            and shows you how to make your writing clearer.
          </p>
          <div className="mt-10">
            <HeroForm />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
            <span>Or try:</span>
            <Link href="/dashboard/compare" className="font-bold text-primary hover:underline">
              Compare sites
            </Link>
            <span>·</span>
            <Link href="/dashboard/detector" className="font-bold text-primary hover:underline">
              AI Detector
            </Link>
            <span>·</span>
            <Link href="/dashboard/rewriter" className="font-bold text-primary hover:underline">
              Rewriter
            </Link>
          </div>

          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-3 gap-4 sm:grid-cols-6">
            {CHECKS.map(({ icon: Icon, label }, i) => (
              <div key={label} className="brutal brutal-hover flex flex-col items-center gap-2 p-4">
                <ScoreRing score={[62, 88, 94, 71, 97, 83][i]} size={56} stroke={5} />
                <span className="flex items-center gap-1 text-xs font-bold">
                  <Icon className="h-3 w-3" /> {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="title-bar text-3xl font-black uppercase tracking-tight">Every tool, one dashboard</h2>
          <p className="mt-5 text-muted-foreground">
            Check your website, compare it with competitors, share reports and improve your writing, or build it all into your own app.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map(({ icon: Icon, title, description, points, href }) => (
            <Card key={title} className="brutal-hover group flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-4 pt-6">
                <div className="grid h-11 w-11 place-items-center border-2 border-ink bg-primary text-white shadow-brutal-xs">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>
                <ul className="space-y-2 text-sm">
                  {points.map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" /> {p}
                    </li>
                  ))}
                </ul>
                <Link href={href} className="mt-auto inline-flex items-center gap-1 text-sm font-bold text-primary">
                  Learn more <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="coming-soon" className="border-t-2 border-ink bg-card">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="chip mb-5">On the roadmap</span>
            <h2 className="title-bar text-3xl font-black uppercase tracking-tight">Coming soon</h2>
            <p className="mt-5 text-muted-foreground">We&apos;re building more tools to help you grow online. Sign up free to get them first.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COMING_SOON_TOOLS.slice(0, 4).map(({ slug, icon: Icon, title, tagline, status }) => (
              <Link key={slug} href={`/tools#${slug}`} className="brutal brutal-hover p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center border-2 border-ink bg-muted text-foreground">
                    <Icon className="h-5 w-5" />
                  </span>
                  {status === "in-development" ? <Badge>In development</Badge> : <Badge tone="outline">Soon</Badge>}
                </div>
                <p className="font-black">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>
              </Link>
            ))}
          </div>
          <p className="mt-8 text-center">
            <Link href="/tools#coming-soon" className="text-sm font-bold text-primary hover:underline">
              See the full roadmap →
            </Link>
          </p>
        </div>
      </section>

      <section id="how-it-works" className="border-y-2 border-ink">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="title-bar text-center text-3xl font-black uppercase tracking-tight">How it works</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="brutal p-6">
                <div className="mb-4 grid h-11 w-11 place-items-center border-2 border-ink bg-primary font-mono text-lg font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <h3 className="font-black">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="free" className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <h2 className="title-bar text-3xl font-black uppercase tracking-tight">Free for everyone</h2>
            <p className="mt-5 text-muted-foreground">
              No plans, no credit card. Create an account and start auditing and writing today. Your limits reset every day.
            </p>
            <AuthCta className="mt-8" signedInLabel="Open your dashboard" />
          </div>
          <Card>
            <CardContent className="pt-6">
              <ul className="space-y-3">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[15px]">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="freelancers" className="border-y-2 border-ink bg-card">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="title-bar text-3xl font-black uppercase tracking-tight">Need a hand? Hire a developer or writer</h2>
            <p className="mt-5 text-muted-foreground">
              Website reports suggest developers who match the issues found, and the writing tools suggest writers who match what
              you&apos;re working on, from SEO articles to books and scripts.
            </p>
          </div>
          {featured.length > 0 && (
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((f) => (
                <FreelancerListCard key={f.id} freelancer={f} />
              ))}
            </div>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/freelancers" className={buttonVariants({ variant: "contrast" })}>
              Browse freelancers
            </Link>
            <Link href="/dashboard/freelancer" className={buttonVariants({ variant: "outline" })}>
              Get listed as a freelancer
            </Link>
          </div>
        </div>
      </section>

      <section id="faq">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <h2 className="title-bar text-center text-3xl font-black uppercase tracking-tight">Frequently asked questions</h2>
          <div className="brutal mt-10 divide-y-2 divide-ink">
            {FAQ.map((item) => (
              <details key={item.q} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-extrabold">
                  {item.q}
                  <span className="grid h-7 w-7 shrink-0 place-items-center border-2 border-ink text-lg leading-none transition-transform group-open:rotate-45 group-open:bg-primary group-open:text-white">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[15px] text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Lucenta is built for better writing, not for cheating. Read our{" "}
            <Link href="/responsible-use" className="font-bold text-primary hover:underline">
              Responsible Use Policy
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="border-2 border-ink bg-primary p-10 text-center text-primary-foreground shadow-brutal md:p-16">
          <h2 className="text-3xl font-black uppercase tracking-tight md:text-4xl">Ready to see your score?</h2>
          <p className="mx-auto mt-3 max-w-xl opacity-90">Create a free account and run your first AI website audit in under a minute.</p>
          <AuthCta className="mt-8 bg-white !text-[#0b0b0f]" />
        </div>
      </section>
    </>
  );
}
