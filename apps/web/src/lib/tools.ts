import {
  BarChart3,
  Bell,
  Bot,
  FileText,
  FileUp,
  Globe,
  Puzzle,
  Share2,
  Users,
  Wand2,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type Tool = {
  slug: string;
  icon: LucideIcon;
  title: string;
  tagline: string;
  description: string;
  features: string[];
  href?: string;
  /** Roadmap items only: shown as "In development" instead of "Coming soon". */
  status?: "in-development";
};

export const AVAILABLE_TOOLS: Tool[] = [
  {
    slug: "website-analyzer",
    icon: Globe,
    title: "Website Analyzer",
    tagline: "See what your website is missing and how to fix it.",
    description:
      "Paste any URL and Lucenta runs 50+ checks across performance, SEO, accessibility, security, mobile and content. An AI review then reads your page like a visitor would and adds suggestions about your message, calls to action and trust signals.",
    features: [
      "Overall score and grade, plus a score for each of 7 categories",
      "Page weight, request count, server response time and oversized files",
      "SEO checks: titles, meta descriptions, headings, sitemap, robots.txt, structured data, broken links",
      "Security headers, HTTPS and clickjacking protection",
      "AI review: summary, target audience, strengths and content issues",
      "Prioritized fixes with step-by-step instructions",
    ],
    href: "/dashboard/analyzer",
  },
  {
    slug: "competitor-comparison",
    icon: BarChart3,
    title: "Competitor comparison",
    tagline: "See how your site stacks up.",
    description:
      "Scan your site next to up to 3 competitors with the same 50+ checks. Lucenta ranks every site, shows exactly which checks competitors pass and you don't, and turns the gaps into a list of fixes, starting with the quick wins.",
    features: [
      "Side-by-side overall, category and speed scores",
      "Gaps: checks competitors pass that your site misses, with how to fix them",
      "Quick wins: easy, high-value fixes competitors already have",
      "Where you're ahead: strengths to mention in your pitch",
      "Re-run any time and see how every score changed",
      "Sites you already scanned today don't use another audit",
    ],
    href: "/dashboard/compare",
  },
  {
    slug: "pdf-reports",
    icon: FileText,
    title: "PDF reports & share links",
    tagline: "Send a polished report to your client or team.",
    description:
      "Download any website report as a clean, printable PDF, or create a read-only link that anyone can open without an account. Agencies can download a white-label version with their own company name instead of Lucenta.",
    features: [
      "Full PDF: scores, summary, prioritized fixes with steps, metrics and every check",
      "Private share links: only people with the link can see the report",
      "Turn a link off at any time and it stops working",
      "White-label PDFs with your company name for client work",
      "People you share with can download the PDF too",
    ],
    href: "/dashboard/analyzer",
  },
  {
    slug: "ai-detector",
    icon: Bot,
    title: "AI Text Detector",
    tagline: "Find out how likely text is to be AI-generated.",
    description:
      "Paste an article, email, post or your own draft and get an AI-likelihood score with the sentences that read as machine-written, along with the reasons why. Scores are estimates, not proof, so use them to start a conversation, never as the only evidence against someone.",
    features: [
      "AI-likelihood score with a clear label",
      "Sentence-by-sentence highlights",
      "Explanations: burstiness, sentence length, vocabulary, AI phrases",
      "Up to 3,000 characters per text, or upload a whole document",
      "Get writing suggestions for flagged text in one click",
    ],
    href: "/dashboard/detector",
  },
  {
    slug: "document-upload",
    icon: FileUp,
    title: "Document uploads",
    tagline: "Check a whole document for AI writing.",
    description:
      "Upload a .docx, .pdf or .txt file to the AI Detector instead of pasting text. Long documents are checked in parts of up to 3,000 characters and combined into one report, with a score for each part and a PDF you can download and share.",
    features: [
      ".docx, .pdf, .txt and .md files up to 4 MB",
      "One combined score, plus a score for every part",
      "Sentence highlights across the whole document",
      "Downloadable PDF report of any AI check",
      "Each part uses 1 daily text, so up to 5 parts a day",
    ],
    href: "/dashboard/detector",
  },
  {
    slug: "rewriter",
    icon: Wand2,
    title: "Rewriter",
    tagline: "Make stiff, wordy drafts clear and natural.",
    description:
      "Two ways to improve your writing. Suggestions mode points out unclear, wordy or generic sentences and explains how to fix them, so you make the edits yourself. Rewrite mode polishes emails, posts, product copy and your own drafts while keeping your meaning, names, numbers and quotes intact. Built for better writing, not for cheating: students get Suggestions mode only, and everyone should follow their school's, employer's or publisher's rules on AI use.",
    features: [
      "Suggestions mode: sentence-by-sentence feedback, no rewriting",
      "Rewrite mode: 6 tones and 3 levels of change",
      "Keep-words list so brand names and terms never change",
      "Meaning check that rejects rewrites which add or lose facts",
      "Show changes (word-level diff) and one-click copy",
      "Students get Suggestions only, to support academic integrity",
    ],
    href: "/dashboard/rewriter",
  },
  {
    slug: "freelancers",
    icon: Wrench,
    title: "Hire a freelancer",
    tagline: "Developers and content writers, matched to what you need.",
    description:
      "Don't want to do everything yourself? Website reports suggest developers whose skills match the issues found, and the writing tools suggest writers who specialise in your kind of content: SEO articles, copy, books, scripts and more. Developers and writers can create their own profile with a photo, portfolio gallery, services and contact details.",
    features: [
      "Developers matched to the issues in each report",
      "Writers matched to the content you're working on",
      "Full profiles with portfolio gallery and services",
      "WhatsApp, call or email in one tap, with no fees",
    ],
    href: "/freelancers",
  },
  {
    slug: "api",
    icon: Share2,
    title: "Developer API",
    tagline: "Build Lucenta into your own product.",
    description:
      "Run website audits and AI detection from your own apps, scripts and workflows. Create an API key in your dashboard, call a simple REST API with JSON responses, and get a webhook when an audit finishes. API requests share your account's daily limits.",
    features: [
      "REST endpoints for audits, reports, AI detection and usage",
      "Full audit reports as JSON: scores, fixes, metrics and every check",
      "Signed webhooks when an audit completes or fails",
      "Up to 5 API keys you can revoke at any time",
      "Usage dashboard with your recent requests",
    ],
    href: "/dashboard/api",
  },
];

export const COMING_SOON_TOOLS: Tool[] = [
  {
    slug: "social-profile-analyzer",
    icon: Users,
    title: "Social Profile Analyzer",
    tagline: "Audit your Instagram, X, TikTok and LinkedIn profiles.",
    description: "Scores your bio, profile photo, posting consistency and engagement, and suggests what to post and fix to grow faster.",
    features: ["Bio and profile checks", "Posting frequency and engagement", "Content suggestions"],
  },
  {
    slug: "monitoring",
    icon: Bell,
    title: "Website monitoring & alerts",
    tagline: "Know the moment your site gets worse.",
    description: "Automatic weekly re-scans with an email when your score drops, a page breaks or your SSL is about to expire.",
    features: ["Scheduled re-scans", "Score-drop alerts", "SSL and uptime warnings"],
  },
  {
    slug: "browser-extension",
    icon: Puzzle,
    title: "Browser extension",
    tagline: "Lucenta anywhere you write.",
    description: "Audit the site you're on, or check and improve text in Gmail, Google Docs and LinkedIn without leaving the page.",
    features: ["One-click site audit", "Writing suggestions in any text box", "Chrome and Edge"],
  },
];
