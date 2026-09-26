export type Category = "performance" | "seo" | "accessibility" | "security" | "best_practices" | "mobile" | "content";
export type CheckStatus = "pass" | "warn" | "fail" | "info";
export type Impact = "high" | "medium" | "low";
export type Effort = "easy" | "medium" | "hard";

export type Check = {
  id: string;
  category: Category;
  title: string;
  status: CheckStatus;
  score: number;
  weight: number;
  value?: string;
  details?: string[];
};

export type Recommendation = {
  id: string;
  category: Category;
  title: string;
  impact: Impact;
  effort: Effort;
  why: string;
  how: string[];
  priority: number;
  /** "ai" = found by the AI review; absent on rule-based recommendations and older reports. */
  source?: "rules" | "ai";
};

export type AiReview = {
  summary: string;
  audience: string | null;
  strengths: string[];
  issues: Omit<Recommendation, "id" | "priority" | "source">[];
};

export type CategoryResult = { score: number; checks: Check[] };

export type Report = {
  url: string;
  finalUrl: string;
  fetchedAt: string;
  device: "mobile" | "desktop";
  overall: { score: number; grade: string };
  categories: Record<Category, CategoryResult>;
  metrics: {
    ttfbMs: number;
    htmlKb: number;
    statusCode: number;
    redirects: number;
    requests?: number;
    pageWeightKb?: number;
    // Lighthouse metrics only exist on reports created before the analyzer went AI-only.
    lcp?: number;
    cls?: number;
    inp?: number;
    fcp?: number;
    tbt?: number;
    speedIndex?: number;
    lighthousePerformance?: number;
  };
  missing: { id: string; title: string }[];
  recommendations: Recommendation[];
  techStack: string[];
  page: { title: string | null; description: string | null; h1: string | null; wordCount: number; favicon: string | null };
  summary: string | null;
  ai?: { audience: string | null; strengths: string[] };
  sources: { ai?: boolean; lighthouse?: boolean; aiSummary?: boolean };
};

export const CATEGORY_LABELS: Record<Category, string> = {
  performance: "Performance",
  seo: "SEO",
  accessibility: "Accessibility",
  security: "Security",
  best_practices: "Best Practices",
  mobile: "Mobile",
  content: "Content",
};

export const CATEGORY_WEIGHTS: Record<Category, number> = {
  performance: 0.25,
  seo: 0.25,
  accessibility: 0.15,
  security: 0.15,
  best_practices: 0.1,
  mobile: 0.05,
  content: 0.05,
};
