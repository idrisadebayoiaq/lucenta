import type { Category, Report } from "@/lib/analyzer/types";
import { CATEGORY_LABELS } from "@/lib/analyzer/types";
import { specialtyLabel, type DeveloperSpecialty, type Freelancer, type WriterSpecialty } from "@/lib/freelancers";

export type FreelancerMatch = { freelancer: Freelancer; reasons: string[] };

const CATEGORY_SPECIALTIES: Record<Category, DeveloperSpecialty[]> = {
  performance: ["performance", "frontend", "full_stack"],
  seo: ["technical_seo", "full_stack"],
  accessibility: ["accessibility", "frontend", "web_design"],
  security: ["security", "backend", "full_stack"],
  best_practices: ["full_stack", "maintenance", "frontend"],
  mobile: ["web_design", "frontend", "mobile"],
  content: ["web_design"],
};

const TECH_SPECIALTIES: [RegExp, DeveloperSpecialty][] = [
  [/wordpress/i, "wordpress"],
  [/shopify|woocommerce|magento|bigcommerce/i, "shopify"],
];

function tieBreak(a: Freelancer, b: Freelancer) {
  return a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at);
}

function trustBonus(f: Freelancer) {
  return (f.is_verified ? 5 : 0) + (f.is_available ? 3 : 0);
}

/** Ranks developers by how well their specialties cover the weakest areas of a website report. */
export function matchDevelopers(report: Report | null, developers: Freelancer[], limit = 3): FreelancerMatch[] {
  const devs = developers.filter((d) => d.kind === "developer");
  if (!report) return devs.sort(tieBreak).slice(0, limit).map((freelancer) => ({ freelancer, reasons: [] }));

  const need = (Object.keys(CATEGORY_SPECIALTIES) as Category[]).map((category) => {
    const recs = report.recommendations.filter((r) => r.category === category);
    const weight = Math.max(0, 90 - (report.categories[category]?.score ?? 100)) + recs.reduce((n, r) => n + (r.impact === "high" ? 16 : 8), 0);
    return { category, weight };
  });
  const techNeeds = TECH_SPECIALTIES.filter(([re]) => report.techStack.some((t) => re.test(t))).map(([, s]) => s);

  return devs
    .map((freelancer) => {
      const has = new Set(freelancer.specialties);
      const covered = need
        .filter((n) => n.weight > 0 && CATEGORY_SPECIALTIES[n.category].some((s) => has.has(s)))
        .sort((a, b) => b.weight - a.weight);
      const tech = techNeeds.filter((s) => has.has(s));
      const score = covered.reduce((n, c) => n + c.weight, 0) + tech.length * 30 + trustBonus(freelancer);
      const reasons = [...tech.map(specialtyLabel), ...covered.slice(0, 3).map((c) => CATEGORY_LABELS[c.category])];
      return { freelancer, reasons, score };
    })
    .sort((a, b) => b.score - a.score || tieBreak(a.freelancer, b.freelancer))
    .slice(0, limit)
    .map(({ freelancer, reasons }) => ({ freelancer, reasons }));
}

export type ContentType = { specialty: WriterSpecialty; label: string; reason: string };

const count = (text: string, re: RegExp) => text.match(re)?.length ?? 0;

/** Guesses what kind of writing a text is, so it can be matched with writers who specialise in it. */
export function classifyContent(text: string): ContentType[] {
  const lower = text.toLowerCase();
  const words = text.trim().split(/\s+/).length;
  const hashtags = count(text, /(^|\s)#[a-z]\w+/gi);

  const book = count(text, /[“"][^”"\n]{2,}[”"]/g) * 2 + count(lower, /\b(said|asked|whispered|replied|shouted|murmured)\b/g) + count(lower, /\bchapter\b/g) * 4 + count(lower, /\b(he|she) (was|had|felt|looked|turned|walked)\b/g);
  const business = count(lower, /\b(proposal|stakeholders?|revenue|strategy|quarterly|q[1-4]|roi|objectives?|deliverables?|budget|clients?|kpis?)\b/g);

  const scores: Record<Exclude<WriterSpecialty, "editing" | "translation">, number> = {
    script_writing:
      count(text, /^\s*(INT\.|EXT\.)/gm) * 5 +
      count(text, /\b(FADE IN|FADE OUT|CUT TO)\b/g) * 5 +
      count(text, /\((V\.O\.|O\.S\.|CONT'D)\)/g) * 4 +
      count(text, /^[A-Z][A-Z .'-]{1,24}:?\s*$/gm) * 2 +
      count(lower, /\bscene\b/g),
    book_writing: book,
    ghostwriting: Math.floor((book + business) / 3) + count(lower, /\b(memoir|my story|biography)\b/g) * 3,
    seo_writing:
      count(text, /^#{1,3} /gm) * 2 +
      count(lower, /\b(how to|top \d+|ultimate guide|in this (article|post|guide)|tips|step-by-step|keywords?|seo|search engines?)\b/g) * 2 +
      count(text, /^\s*([-*•]|\d+\.)\s/gm) +
      (words > 300 ? 1 : 0),
    copywriting:
      count(lower, /\b(buy|order now|shop|sign up|get started|limited|offer|discount|free trial|save \d+%|customers?|guarantee|today only|call to action)\b/g) * 1.5 +
      count(text, /!/g) * 0.5,
    email_newsletters:
      count(text, /^(hi|hello|dear|hey)\b[^\n]{0,40},?\s*$/gim) * 3 +
      count(lower, /\b(best regards|kind regards|sincerely|warm regards|cheers|thanks again)\b/g) * 3 +
      count(lower, /\b(newsletter|subscribe|unsubscribe|this week's)\b/g) * 2,
    social_media: hashtags * 2 + count(text, /(^|\s)@\w+/g) + count(text, /\p{Extended_Pictographic}/gu) + (hashtags && text.length < 400 ? 2 : 0),
    technical_writing:
      count(text, /`[^`]+`/g) * 3 +
      count(lower, /\b(install|configure|api|endpoint|function|npm|command|parameter|click|settings|dashboard|database)\b/g) +
      count(lower, /\bstep \d+\b/g) * 2,
    business_writing: business,
  };

  const reasons: Record<WriterSpecialty, string> = {
    script_writing: "It reads like a script or screenplay",
    book_writing: "It reads like a story or book",
    ghostwriting: "It could be part of a book or memoir",
    seo_writing: "It looks like a blog post or SEO article",
    copywriting: "It reads like marketing or sales copy",
    email_newsletters: "It looks like an email or newsletter",
    social_media: "It looks like a social media post",
    technical_writing: "It reads like documentation or a how-to",
    business_writing: "It reads like business writing",
    editing: "Any writing benefits from a professional edit",
    translation: "Translation",
  };

  const detected = (Object.entries(scores) as [WriterSpecialty, number][])
    .filter(([, score]) => score >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([specialty]) => ({ specialty, label: specialtyLabel(specialty), reason: reasons[specialty] }));

  return [...detected, { specialty: "editing", label: specialtyLabel("editing"), reason: reasons.editing }];
}

/** Ranks writers by how well their specialties fit the kind of content the user is working on. */
export function matchWriters(text: string, writers: Freelancer[], limit = 3): { types: ContentType[]; matches: FreelancerMatch[] } {
  const types = classifyContent(text);
  const matches = writers
    .filter((w) => w.kind === "writer")
    .map((freelancer) => {
      const has = new Set(freelancer.specialties);
      const hits = types.filter((t) => has.has(t.specialty));
      const score = hits.reduce((n, t) => n + (types.length - types.indexOf(t)) * 10, 0) + trustBonus(freelancer);
      return { freelancer, reasons: hits.map((t) => t.label), score };
    })
    .sort((a, b) => b.score - a.score || tieBreak(a.freelancer, b.freelancer))
    .slice(0, limit)
    .map(({ freelancer, reasons }) => ({ freelancer, reasons }));
  return { types, matches };
}
