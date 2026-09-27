import {
  BarChart3,
  Bell,
  Bot,
  FileText,
  FileUp,
  Globe,
  Puzzle,
  Share2,
  UserPlus,
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
      "Up to 3,000 characters per text",
      "Get writing suggestions for flagged text in one click",
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
    slug: "hire-a-developer",
    icon: Wrench,
    title: "Hire a developer",
    tagline: "Get an expert to fix the issues in your report.",
    description:
      "Don't want to fix everything yourself? Every website report links to available developers you can reach on WhatsApp, by phone or email, with your report context already filled in.",
    features: ["Verified developers with real portfolios", "WhatsApp, call or email in one tap", "Your audited site is included in the message"],
    href: "/developers",
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
    slug: "developer-accounts",
    icon: UserPlus,
    title: "Developer accounts",
    tagline: "Sign up as a developer and get hired from reports.",
    description:
      "Create a developer account, fill in your skills, portfolio and contact details, and get suggested to people when they analyze their website. Developers are ranked by how well they match each report: the site's performance, results and the issues found in the analytics.",
    features: [
      "Developer sign-up with skills, portfolio and contact details",
      "Suggested on website reports that match your skills",
      "Ranking based on each report's performance, results and issues",
    ],
  },
  {
    slug: "pdf-reports",
    icon: FileText,
    title: "PDF reports & share links",
    tagline: "Send a polished report to your client or team.",
    description: "Download any website report as a branded PDF or share a read-only link.",
    features: ["Branded PDF export", "Public share links", "White-label for agencies"],
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
    slug: "competitor-comparison",
    icon: BarChart3,
    title: "Competitor comparison",
    tagline: "See how your site stacks up.",
    description: "Scan your site next to up to 3 competitors and see exactly where they beat you.",
    features: ["Side-by-side scores", "Gaps and quick wins", "Track changes over time"],
  },
  {
    slug: "document-upload",
    icon: FileUp,
    title: "Document uploads",
    tagline: "Check and improve whole documents.",
    description: "Upload .docx and .pdf files to the AI Detector and Rewriter instead of pasting text.",
    features: [".docx and .pdf support", "Keeps your formatting", "Download the result"],
  },
  {
    slug: "browser-extension",
    icon: Puzzle,
    title: "Browser extension",
    tagline: "Lucenta anywhere you write.",
    description: "Audit the site you're on, or check and improve text in Gmail, Google Docs and LinkedIn without leaving the page.",
    features: ["One-click site audit", "Writing suggestions in any text box", "Chrome and Edge"],
  },
  {
    slug: "api",
    icon: Share2,
    title: "Developer API",
    tagline: "Build Lucenta into your own product.",
    description: "Run website audits and AI detection from your own apps and workflows.",
    features: ["REST API", "Webhooks", "Usage dashboard"],
  },
];
