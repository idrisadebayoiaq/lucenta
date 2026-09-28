import { CATEGORY_LABELS, type Category, type Check, type Recommendation, type Report } from "./types";

export const MAX_COMPETITORS = 3;

export function displayUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}

/** A site in a comparison. The first site is always the user's own. */
export type ComparedSite = { label: string; report: Report };

export type Gap = {
  key: string;
  category: Category;
  title: string;
  status: "warn" | "fail";
  /** Competitors that pass this check. */
  aheadOf: string[];
  recommendation: Recommendation | null;
};

export type Advantage = {
  key: string;
  category: Category;
  title: string;
  /** Competitors that warn or fail this check. */
  behind: string[];
};

export type CategoryStanding = {
  category: Category;
  scores: number[];
  /** Index of the best-scoring site; ties go to the user's site. */
  leader: number;
  rank: number;
};

export type SiteComparison = {
  rank: number;
  total: number;
  overall: number[];
  categories: CategoryStanding[];
  gaps: Gap[];
  quickWins: Gap[];
  advantages: Advantage[];
};

const checkKey = (c: Pick<Check, "category" | "id">) => `${c.category}:${c.id}`;

function checkMap(report: Report) {
  const map = new Map<string, Check>();
  for (const cat of Object.keys(report.categories) as Category[]) {
    for (const check of report.categories[cat].checks) {
      if (check.status !== "info" && !map.has(checkKey(check))) map.set(checkKey(check), check);
    }
  }
  return map;
}

/** 1-based rank of the first value; equal scores share a rank. */
function rankOf(values: number[]) {
  return 1 + values.slice(1).filter((v) => v > values[0]).length;
}

export function leaderIndex(values: number[]) {
  return values.reduce((best, v, i) => (v > values[best] ? i : best), 0);
}

export function compareSites([you, ...competitors]: ComparedSite[]): SiteComparison {
  const sites = [you, ...competitors];
  const overall = sites.map((s) => s.report.overall.score);

  const categories = (Object.keys(CATEGORY_LABELS) as Category[]).map((category) => {
    const scores = sites.map((s) => s.report.categories[category]?.score ?? 0);
    return { category, scores, leader: leaderIndex(scores), rank: rankOf(scores) };
  });

  const yours = checkMap(you.report);
  const theirs = competitors.map((c) => ({ label: c.label, checks: checkMap(c.report) }));
  const recommendations = new Map(you.report.recommendations.map((r) => [r.id, r]));

  const gaps: Gap[] = [];
  const advantages: Advantage[] = [];
  for (const [key, check] of yours) {
    if (check.status === "warn" || check.status === "fail") {
      const aheadOf = theirs.filter((t) => t.checks.get(key)?.status === "pass").map((t) => t.label);
      if (aheadOf.length) {
        gaps.push({
          key,
          category: check.category,
          title: check.title,
          status: check.status,
          aheadOf,
          recommendation: recommendations.get(check.id) ?? null,
        });
      }
    } else if (check.status === "pass") {
      const behind = theirs
        .filter((t) => {
          const status = t.checks.get(key)?.status;
          return status === "warn" || status === "fail";
        })
        .map((t) => t.label);
      if (behind.length) advantages.push({ key, category: check.category, title: check.title, behind });
    }
  }

  gaps.sort(
    (a, b) =>
      (b.recommendation?.priority ?? 0) - (a.recommendation?.priority ?? 0) ||
      b.aheadOf.length - a.aheadOf.length ||
      (a.status === "fail" ? -1 : 1) - (b.status === "fail" ? -1 : 1),
  );
  advantages.sort((a, b) => b.behind.length - a.behind.length);

  const quickWins = gaps.filter((g) => g.recommendation?.effort === "easy" && g.recommendation.impact !== "low").slice(0, 5);

  return { rank: rankOf(overall), total: sites.length, overall, categories, gaps, quickWins, advantages };
}
