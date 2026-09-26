import { z } from "zod";
import { chatCompletion, isLLMConfigured } from "@/lib/openai";
import { CATEGORY_LABELS, type AiReview, type Category, type Check, type Report } from "./types";

export type PageFacts = {
  headings: string[];
  visibleText: string;
  ctas: string[];
  navLinks: string[];
  images: number;
  forms: number;
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as [Category, ...Category[]];
/** Speed, security and best practices are fully covered by rule-based checks, so AI issues there are duplicates. */
const AI_CATEGORIES: Category[] = ["content", "seo", "accessibility", "mobile"];

/** Topics owned by rule-based checks; AI issues about them are dropped as duplicates. */
const RULE_TOPICS = [
  /compress|gzip|brotli/i,
  /cach/i,
  /secur|header|https|ssl|csp|clickjack/i,
  /(optimi[sz]e|compress|resize) (your )?images?|image (size|format|compression|dimension)|webp|avif|alt text|lazy/i,
  /\bh[1-6]\b|\bheadings?\b/i,
  /canonical|sitemap|robots|index/i,
  /speed|load(ing)? time|performance|server|ttfb|render|minif|javascript|\bscripts?\b|page (weight|size)|(http|number of) requests/i,
  /readab|flesch/i,
  /title (tag|length)|meta description/i,
  /favicon|viewport|zoom|redirect|doctype|charset|mixed content/i,
  /open graph|structured data|schema|json-ld/i,
  /broken link/i,
  /form labels?|landmark|lang(uage)? attribute|accessible name/i,
];

function duplicatesRules(title: string) {
  return RULE_TOPICS.some((topic) => topic.test(title));
}

const reviewSchema = z.object({
  summary: z.string().min(20),
  audience: z.string().nullish(),
  strengths: z.array(z.string()).max(6).catch([]),
  issues: z
    .array(
      z.object({
        title: z.string().min(3).max(120),
        category: z.enum(CATEGORIES).catch("content"),
        impact: z.enum(["high", "medium", "low"]).catch("medium"),
        effort: z.enum(["easy", "medium", "hard"]).catch("medium"),
        why: z.string().min(5),
        how: z.array(z.string()).min(1).max(6),
      }),
    )
    .max(8)
    .catch([]),
});

const SYSTEM_PROMPT = `You are a senior web consultant auditing a website for a non-technical owner.
You receive automated check results plus the page's own content. Return ONLY a JSON object:
{
  "summary": "4-6 sentence plain-English overview: what the site is, overall health, biggest strengths, most urgent problems, and what to fix first",
  "audience": "one short sentence on who the page seems to target, or null if unclear",
  "strengths": ["2-4 short things the site does well"],
  "issues": [{"title": "short imperative fix", "category": "content|seo|accessibility|mobile", "impact": "high|medium|low", "effort": "easy|medium|hard", "why": "1-2 sentences on the business impact", "how": ["2-4 concrete steps specific to THIS site"]}]
}
Rules for "issues" (3-6 items):
- Focus ONLY on what automated checks cannot see: unclear value proposition, weak or missing calls to action, confusing navigation, thin or generic copy, missing trust signals (testimonials, contact details, pricing, about), poor SEO copy (title/description/headings not matching the offer), and conversion blockers.
- Never suggest speed, image optimization, security headers, HTTPS or other technical fixes, and do NOT repeat anything in "alreadyFlagged"; those are already in the report. Mention the most important of them in the summary instead.
- Only claim something is missing if it is absent from the provided headings, navigation, calls to action and text.
- Be specific: quote the page's real headings, button text or copy when pointing out a problem.
- Only use the numbers provided; never invent metrics, traffic or rankings. Plain text, no markdown.
- Never use em dashes or en dashes. Use commas, periods, colons or parentheses instead, and write number ranges as "10 to 20".`;

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** AI review of the audit + page content. Returns null when no LLM key is configured or the call fails. */
export async function generateAiReview(report: Report, checks: Check[], facts: PageFacts): Promise<AiReview | null> {
  if (!isLLMConfigured()) return null;

  const input = {
    url: report.finalUrl,
    overall: report.overall,
    categoryScores: Object.fromEntries(CATEGORIES.map((c) => [CATEGORY_LABELS[c], report.categories[c].score])),
    metrics: report.metrics,
    techStack: report.techStack,
    page: {
      title: report.page.title,
      metaDescription: report.page.description,
      h1: report.page.h1,
      wordCount: report.page.wordCount,
      headings: facts.headings.slice(0, 25).map((h) => truncate(h, 120)),
      navigation: facts.navLinks.slice(0, 15),
      callsToAction: facts.ctas.slice(0, 15),
      images: facts.images,
      forms: facts.forms,
      visibleText: truncate(facts.visibleText, 3500),
    },
    alreadyFlagged: report.recommendations.map((r) => r.title),
    failedChecks: checks
      .filter((c) => c.status === "fail" || c.status === "warn")
      .map((c) => `${CATEGORY_LABELS[c.category]}: ${c.title}${c.value ? ` (${truncate(c.value, 80)})` : ""}`),
  };

  try {
    const raw = await chatCompletion(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(input) },
      ],
      { temperature: 0.3, maxTokens: 1800, json: true, tier: "fast" },
    );
    const json = raw.replace(/^```(?:json)?\s*|\s*```$/g, "");
    const parsed = reviewSchema.safeParse(JSON.parse(json));
    if (!parsed.success) return null;
    const { summary, audience, strengths, issues } = parsed.data;
    return { summary, audience: audience ?? null, strengths, issues: issues.filter((i) => AI_CATEGORIES.includes(i.category) && !duplicatesRules(i.title)),
    };
  } catch {
    return null;
  }
}
