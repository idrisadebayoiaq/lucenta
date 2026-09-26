import * as cheerio from "cheerio";
import { RECOMMENDATIONS } from "./recommendations";
import { normalizeUrl, readTextLimited, safeFetch } from "./safe-fetch";
import {
  CATEGORY_LABELS,
  CATEGORY_WEIGHTS,
  type Category,
  type CategoryResult,
  type Check,
  type CheckStatus,
  type Recommendation,
  type Report,
} from "./types";
import { generateAiReview } from "./summary";

const STATUS_SCORE: Record<CheckStatus, number> = { pass: 1, warn: 0.5, fail: 0, info: 1 };
const IMPACT_VALUE = { high: 3, medium: 2, low: 1 };
const EFFORT_VALUE = { easy: 1, medium: 2, hard: 3 };

function grade(score: number) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 65) return "C";
  if (score >= 50) return "D";
  return "F";
}

function countSyllables(word: string) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}

function fleschReadingEase(text: string) {
  const sentences = Math.max(1, (text.match(/[.!?]+(\s|$)/g) ?? []).length);
  const words = text.split(/\s+/).filter((w) => /[a-z]/i.test(w));
  if (words.length < 30) return null;
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  return 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syllables / words.length);
}

const TECH_RULES: { name: string; test: (html: string, headers: Headers) => boolean }[] = [
  { name: "WordPress", test: (h) => /wp-content|wp-includes/i.test(h) },
  { name: "Shopify", test: (h) => /cdn\.shopify\.com|Shopify\.theme/i.test(h) },
  { name: "Wix", test: (h) => /static\.wixstatic\.com|wix\.com/i.test(h) },
  { name: "Squarespace", test: (h) => /squarespace/i.test(h) },
  { name: "Webflow", test: (h) => /webflow/i.test(h) },
  { name: "Next.js", test: (h, hd) => /__NEXT_DATA__|\/_next\/static/i.test(h) || /next\.js/i.test(hd.get("x-powered-by") ?? "") },
  { name: "Nuxt", test: (h) => /__NUXT__|\/_nuxt\//i.test(h) },
  { name: "React", test: (h) => /data-reactroot|react-dom/i.test(h) },
  { name: "Vue.js", test: (h) => /data-v-[a-f0-9]{6,}|vue(\.min)?\.js/i.test(h) },
  { name: "Angular", test: (h) => /ng-version=/i.test(h) },
  { name: "jQuery", test: (h) => /jquery(\.min)?\.js/i.test(h) },
  { name: "Bootstrap", test: (h) => /bootstrap(\.min)?\.(css|js)/i.test(h) },
  { name: "Tailwind CSS", test: (h) => /class="[^"]*\b(?:flex|grid) [^"]*\b(?:px|py|mt|mb)-\d/i.test(h) },
  { name: "Google Analytics", test: (h) => /googletagmanager\.com\/gtag|google-analytics\.com/i.test(h) },
  { name: "Google Tag Manager", test: (h) => /googletagmanager\.com\/gtm\.js/i.test(h) },
  { name: "Meta Pixel", test: (h) => /connect\.facebook\.net\/.*fbevents/i.test(h) },
  { name: "Hotjar", test: (h) => /static\.hotjar\.com/i.test(h) },
  { name: "Cloudflare", test: (_, hd) => (hd.get("server") ?? "").toLowerCase().includes("cloudflare") || hd.has("cf-ray") },
  { name: "Vercel", test: (_, hd) => hd.has("x-vercel-id") || (hd.get("server") ?? "").toLowerCase() === "vercel" },
  { name: "Netlify", test: (_, hd) => (hd.get("server") ?? "").toLowerCase().includes("netlify") },
  { name: "Nginx", test: (_, hd) => (hd.get("server") ?? "").toLowerCase().includes("nginx") },
  { name: "Apache", test: (_, hd) => (hd.get("server") ?? "").toLowerCase().includes("apache") },
  { name: "PHP", test: (_, hd) => /php/i.test(hd.get("x-powered-by") ?? "") },
];

async function fetchSmall(url: URL) {
  try {
    const { response } = await safeFetch(url, { timeoutMs: 8000 });
    const { text } = await readTextLimited(response, 512 * 1024);
    return { ok: response.ok, status: response.status, text, contentType: response.headers.get("content-type") ?? "" };
  } catch {
    return { ok: false, status: 0, text: "", contentType: "" };
  }
}

async function checkLinks(urls: URL[]) {
  const broken: string[] = [];
  const queue = [...urls];
  async function worker() {
    while (queue.length) {
      const url = queue.shift()!;
      try {
        let { response } = await safeFetch(url, { method: "HEAD", timeoutMs: 6000 });
        if (response.status === 405 || response.status === 403) ({ response } = await safeFetch(url, { timeoutMs: 6000 }));
        if (response.status >= 400) broken.push(`${url.toString()} (${response.status})`);
        await response.body?.cancel();
      } catch {
        // Timeouts and blocked hosts are not reported as broken to avoid false positives.
      }
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  return broken;
}

const MAX_RESOURCE_BYTES = 5 * 1024 * 1024;

/** Transfer size of a resource: Content-Length from HEAD, else bytes streamed from a GET (capped). */
async function resourceSize(url: URL): Promise<number | null> {
  try {
    const { response: head } = await safeFetch(url, { method: "HEAD", timeoutMs: 6000 });
    await head.body?.cancel();
    const length = Number(head.headers.get("content-length"));
    if (head.ok && length > 0) return length;

    const { response } = await safeFetch(url, { timeoutMs: 8000 });
    if (!response.ok || !response.body) return null;
    const reader = response.body.getReader();
    let bytes = 0;
    while (bytes < MAX_RESOURCE_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
    }
    await reader.cancel();
    return bytes;
  } catch {
    return null;
  }
}

async function measureResources(urls: URL[]) {
  const sizes = new Map<string, number>();
  const queue = [...urls];
  async function worker() {
    while (queue.length) {
      const url = queue.shift()!;
      const size = await resourceSize(url);
      if (size != null) sizes.set(url.toString(), size);
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  return sizes;
}

export async function analyzeWebsite(input: string, device: "mobile" | "desktop" = "mobile"): Promise<Report> {
  const startUrl = normalizeUrl(input);
  const checks: Check[] = [];
  const add = (c: Omit<Check, "score"> & { score?: number }) => checks.push({ ...c, score: c.score ?? STATUS_SCORE[c.status] });

  const { response, finalUrl, redirects, ttfbMs } = await safeFetch(startUrl, { timeoutMs: 20000 });
  const { text: html, bytes } = await readTextLimited(response);
  const headers = response.headers;
  if (!response.ok) throw new Error(`The site responded with HTTP ${response.status}.`);
  if (!(headers.get("content-type") ?? "").includes("html")) throw new Error("That URL doesn't return an HTML page.");

  const $ = cheerio.load(html);
  const origin = finalUrl.origin;
  const isHttps = finalUrl.protocol === "https:";

  // ---------------- Performance ----------------
  add({
    id: "ttfb",
    category: "performance",
    title: "Server response time",
    status: ttfbMs < 600 ? "pass" : ttfbMs < 1500 ? "warn" : "fail",
    weight: 3,
    value: `${Math.round(ttfbMs)} ms`,
  });
  const encoding = headers.get("content-encoding") ?? "";
  add({
    id: "compression",
    category: "performance",
    title: "Text compression (gzip/brotli)",
    status: /br|gzip|deflate|zstd/i.test(encoding) ? "pass" : "fail",
    weight: 2,
    value: encoding || "none",
  });
  const htmlKb = bytes / 1024;
  add({
    id: "html-size",
    category: "performance",
    title: "HTML document size",
    status: htmlKb < 150 ? "pass" : htmlKb < 500 ? "warn" : "fail",
    weight: 1,
    value: `${htmlKb.toFixed(0)} KB`,
  });
  const cacheControl = headers.get("cache-control") ?? "";
  add({
    id: "caching",
    category: "performance",
    title: "Caching headers",
    status: cacheControl || headers.get("etag") || headers.get("last-modified") ? "pass" : "warn",
    weight: 1,
    value: cacheControl || "not set",
  });
  const blockingScripts = $("head script[src]:not([async]):not([defer]):not([type='module'])").length;
  add({
    id: "render-blocking",
    category: "performance",
    title: "Render-blocking scripts in <head>",
    status: blockingScripts === 0 ? "pass" : blockingScripts <= 2 ? "warn" : "fail",
    weight: 2,
    value: `${blockingScripts} found`,
  });
  const images = $("img").toArray();
  const lazyCandidates = images.slice(3);
  const notLazy = lazyCandidates.filter((el) => $(el).attr("loading") !== "lazy").length;
  if (lazyCandidates.length > 0) {
    add({
      id: "lazy-images",
      category: "performance",
      title: "Offscreen images lazy-loaded",
      status: notLazy === 0 ? "pass" : notLazy / lazyCandidates.length < 0.5 ? "warn" : "fail",
      weight: 1,
      value: `${lazyCandidates.length - notLazy}/${lazyCandidates.length}`,
    });
  }
  const noDims = images.filter((el) => !$(el).attr("width") || !$(el).attr("height"));
  if (images.length > 0) {
    add({
      id: "image-dimensions",
      category: "performance",
      title: "Images have width & height",
      status: noDims.length === 0 ? "pass" : noDims.length / images.length < 0.3 ? "warn" : "fail",
      weight: 1,
      value: `${images.length - noDims.length}/${images.length}`,
    });
    const legacy = images.filter((el) => /\.(jpe?g|png)(\?|$)/i.test($(el).attr("src") ?? "")).length;
    add({
      id: "modern-images",
      category: "performance",
      title: "Modern image formats (WebP/AVIF)",
      status: legacy === 0 ? "pass" : legacy / images.length < 0.5 ? "warn" : "fail",
      weight: 1,
      value: `${legacy} JPEG/PNG images`,
    });
  }

  const resourceUrls = new Map<string, URL>();
  $("script[src], link[rel~='stylesheet'][href], img[src], link[rel~='preload'][href], iframe[src], video[src], source[src]").each((_, el) => {
    const ref = $(el).attr("src") ?? $(el).attr("href");
    if (!ref || ref.startsWith("data:")) return;
    try {
      const u = new URL(ref, finalUrl);
      if (["http:", "https:"].includes(u.protocol)) resourceUrls.set(u.toString(), u);
    } catch {
      // Ignore malformed URLs.
    }
  });
  const resourceList = [...resourceUrls.values()];
  const sizes = await measureResources(resourceList.slice(0, 40));
  const measured = [...sizes.values()];
  const avgSize = measured.length ? measured.reduce((s, b) => s + b, 0) / measured.length : 0;
  const unmeasured = resourceList.length - measured.length;
  const pageWeightKb = Math.round((bytes + measured.reduce((s, b) => s + b, 0) + avgSize * unmeasured) / 1024);
  const requests = 1 + resourceList.length;
  add({
    id: "page-weight",
    category: "performance",
    title: "Total page weight",
    status: pageWeightKb < 1600 ? "pass" : pageWeightKb < 3500 ? "warn" : "fail",
    weight: 3,
    value: `${pageWeightKb >= 1024 ? `${(pageWeightKb / 1024).toFixed(1)} MB` : `${pageWeightKb} KB`}${unmeasured > 0 ? " (estimated)" : ""}`,
  });
  add({
    id: "request-count",
    category: "performance",
    title: "Number of requests",
    status: requests <= 50 ? "pass" : requests <= 100 ? "warn" : "fail",
    weight: 1,
    value: `${requests} requests`,
  });
  const large = [...sizes.entries()].filter(([, b]) => b > 300 * 1024).sort((a, b) => b[1] - a[1]);
  add({
    id: "large-resources",
    category: "performance",
    title: "No oversized files (>300 KB)",
    status: large.length === 0 ? "pass" : large.length <= 2 ? "warn" : "fail",
    weight: 1,
    value: `${large.length} found`,
    details: large.slice(0, 8).map(([u, b]) => `${u} (${Math.round(b / 1024)} KB)`),
  });

  // ---------------- SEO ----------------
  const title = $("head title").first().text().trim() || null;
  add({ id: "title", category: "seo", title: "Page title present", status: title ? "pass" : "fail", weight: 3, value: title ?? "missing" });
  if (title) {
    add({
      id: "title-length",
      category: "seo",
      title: "Title length (30 to 60 chars)",
      status: title.length >= 30 && title.length <= 60 ? "pass" : title.length >= 15 && title.length <= 70 ? "warn" : "fail",
      weight: 1,
      value: `${title.length} characters`,
    });
  }
  const description = $('meta[name="description" i]').attr("content")?.trim() || null;
  add({ id: "meta-description", category: "seo", title: "Meta description present", status: description ? "pass" : "fail", weight: 3, value: description ?? "missing" });
  if (description) {
    add({
      id: "meta-description-length",
      category: "seo",
      title: "Meta description length (70 to 160 chars)",
      status: description.length >= 70 && description.length <= 160 ? "pass" : "warn",
      weight: 1,
      value: `${description.length} characters`,
    });
  }
  const h1s = $("h1").toArray().map((el) => $(el).text().trim()).filter(Boolean);
  add({ id: "h1", category: "seo", title: "Exactly one H1 heading", status: h1s.length === 1 ? "pass" : h1s.length === 0 ? "fail" : "warn", weight: 2, value: `${h1s.length} found` });
  const levels = $("h1,h2,h3,h4,h5,h6").toArray().map((el) => Number(el.tagName.slice(1)));
  const skips = levels.filter((lvl, i) => i > 0 && lvl - levels[i - 1] > 1).length;
  add({ id: "heading-order", category: "seo", title: "Logical heading hierarchy", status: skips === 0 ? "pass" : "warn", weight: 1, value: skips ? `${skips} skipped levels` : "ok" });
  const canonical = $('link[rel="canonical"]').attr("href");
  add({ id: "canonical", category: "seo", title: "Canonical URL", status: canonical ? "pass" : "warn", weight: 1, value: canonical ?? "missing" });
  const robotsMeta = $('meta[name="robots" i]').attr("content") ?? "";
  const noindex = /noindex/i.test(robotsMeta) || /noindex/i.test(headers.get("x-robots-tag") ?? "");
  add({ id: "noindex", category: "seo", title: "Page is indexable", status: noindex ? "fail" : "pass", weight: 4, value: noindex ? "noindex found" : "indexable" });

  const [robots, sitemap] = await Promise.all([fetchSmall(new URL("/robots.txt", origin)), fetchSmall(new URL("/sitemap.xml", origin))]);
  const robotsOk = robots.ok && /user-agent/i.test(robots.text);
  add({ id: "robots", category: "seo", title: "robots.txt", status: robotsOk ? "pass" : "warn", weight: 1, value: robotsOk ? "found" : "missing" });
  const sitemapInRobots = robots.text.match(/^sitemap:\s*(\S+)/im)?.[1];
  let sitemapOk = sitemap.ok && /<(urlset|sitemapindex)/i.test(sitemap.text);
  if (!sitemapOk && sitemapInRobots) {
    try {
      const alt = await fetchSmall(new URL(sitemapInRobots));
      sitemapOk = alt.ok && /<(urlset|sitemapindex)/i.test(alt.text);
    } catch {
      // Invalid sitemap URL in robots.txt.
    }
  }
  add({ id: "sitemap", category: "seo", title: "XML sitemap", status: sitemapOk ? "pass" : "warn", weight: 2, value: sitemapOk ? "found" : "missing" });

  const jsonLd = $('script[type="application/ld+json"]').toArray();
  const schemaTypes = jsonLd.flatMap((el) => {
    try {
      const data = JSON.parse($(el).text());
      const items = Array.isArray(data) ? data : data["@graph"] ?? [data];
      return items.map((i: { "@type"?: string | string[] }) => i["@type"]).flat().filter(Boolean) as string[];
    } catch {
      return [];
    }
  });
  add({ id: "structured-data", category: "seo", title: "Structured data (JSON-LD)", status: jsonLd.length ? "pass" : "warn", weight: 1, value: schemaTypes.length ? schemaTypes.join(", ") : jsonLd.length ? "present" : "missing" });

  const og = ["og:title", "og:description", "og:image"].filter((p) => !$(`meta[property="${p}"]`).attr("content"));
  add({ id: "open-graph", category: "seo", title: "Open Graph tags", status: og.length === 0 ? "pass" : og.length < 3 ? "warn" : "fail", weight: 1, value: og.length ? `missing ${og.join(", ")}` : "complete" });

  const missingAlt = images.filter((el) => $(el).attr("alt") === undefined);
  if (images.length > 0) {
    add({
      id: "image-alt",
      category: "seo",
      title: "Images have alt text",
      status: missingAlt.length === 0 ? "pass" : missingAlt.length / images.length < 0.2 ? "warn" : "fail",
      weight: 2,
      value: `${missingAlt.length} of ${images.length} missing`,
      details: missingAlt.slice(0, 10).map((el) => $(el).attr("src") ?? "(inline image)"),
    });
  }

  const linkUrls = new Map<string, URL>();
  let internalLinks = 0;
  let externalLinks = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")!;
    if (/^(mailto:|tel:|javascript:|#)/i.test(href)) return;
    try {
      const u = new URL(href, finalUrl);
      u.hash = "";
      if (u.origin === origin) internalLinks++;
      else externalLinks++;
      if (["http:", "https:"].includes(u.protocol)) linkUrls.set(u.toString(), u);
    } catch {
      // Ignore malformed hrefs.
    }
  });
  const broken = await checkLinks([...linkUrls.values()].slice(0, 40));
  add({
    id: "broken-links",
    category: "seo",
    title: "No broken links",
    status: broken.length === 0 ? "pass" : broken.length <= 2 ? "warn" : "fail",
    weight: 2,
    value: `${broken.length} broken of ${Math.min(linkUrls.size, 40)} checked`,
    details: broken,
  });
  add({ id: "links-info", category: "seo", title: "Links on page", status: "info", weight: 0, value: `${internalLinks} internal, ${externalLinks} external` });
  const favicon = $('link[rel~="icon"]').attr("href") ?? null;
  add({ id: "favicon", category: "seo", title: "Favicon", status: favicon ? "pass" : "warn", weight: 1, value: favicon ? "found" : "missing" });

  // ---------------- Accessibility ----------------
  const lang = $("html").attr("lang");
  add({ id: "lang", category: "accessibility", title: "Page language set", status: lang ? "pass" : "fail", weight: 2, value: lang ?? "missing" });
  const inputs = $("input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea").toArray();
  const unlabeled = inputs.filter((el) => {
    const id = $(el).attr("id");
    return !$(el).attr("aria-label") && !$(el).attr("aria-labelledby") && !(id && $(`label[for="${id}"]`).length) && !$(el).closest("label").length;
  });
  if (inputs.length > 0) {
    add({ id: "form-labels", category: "accessibility", title: "Form fields have labels", status: unlabeled.length === 0 ? "pass" : "fail", weight: 2, value: `${unlabeled.length} of ${inputs.length} unlabeled` });
  }
  const unnamed = $("button, a[href]")
    .toArray()
    .filter((el) => !$(el).text().trim() && !$(el).attr("aria-label") && !$(el).attr("title") && !$(el).find("img[alt]:not([alt=''])").length);
  add({ id: "button-names", category: "accessibility", title: "Buttons & links have names", status: unnamed.length === 0 ? "pass" : unnamed.length <= 3 ? "warn" : "fail", weight: 2, value: `${unnamed.length} without names` });
  const hasMain = $("main, [role=main]").length > 0;
  const hasNav = $("nav, [role=navigation]").length > 0;
  add({ id: "landmarks", category: "accessibility", title: "Semantic landmarks", status: hasMain && hasNav ? "pass" : hasMain || hasNav ? "warn" : "fail", weight: 1, value: [hasMain && "main", hasNav && "nav"].filter(Boolean).join(", ") || "none" });
  if (images.length > 0) {
    add({ id: "image-alt", category: "accessibility", title: "Images have alternative text", status: missingAlt.length === 0 ? "pass" : missingAlt.length / images.length < 0.2 ? "warn" : "fail", weight: 2, value: `${missingAlt.length} missing` });
  }
  // ---------------- Security ----------------
  add({ id: "https", category: "security", title: "Served over HTTPS", status: isHttps ? "pass" : "fail", weight: 5, value: finalUrl.protocol.replace(":", "") });
  if (isHttps) {
    try {
      const httpUrl = new URL(finalUrl.toString());
      httpUrl.protocol = "http:";
      const { finalUrl: httpFinal } = await safeFetch(httpUrl, { method: "HEAD", timeoutMs: 8000 });
      add({ id: "https-redirect", category: "security", title: "HTTP redirects to HTTPS", status: httpFinal.protocol === "https:" ? "pass" : "fail", weight: 2 });
    } catch {
      add({ id: "https-redirect", category: "security", title: "HTTP redirects to HTTPS", status: "info", weight: 0, value: "could not verify" });
    }
  }
  const csp = headers.get("content-security-policy") ?? "";
  const securityHeaders: [string, string, string, number][] = [
    ["hsts", "Strict-Transport-Security (HSTS)", "strict-transport-security", 2],
    ["csp", "Content-Security-Policy", "content-security-policy", 2],
    ["x-content-type-options", "X-Content-Type-Options", "x-content-type-options", 1],
    ["referrer-policy", "Referrer-Policy", "referrer-policy", 1],
  ];
  for (const [id, label, header, weight] of securityHeaders) {
    const v = headers.get(header);
    add({ id, category: "security", title: label, status: v ? "pass" : id === "csp" ? "warn" : "fail", weight, value: v ? "set" : "missing" });
  }
  const frameProtected = !!headers.get("x-frame-options") || /frame-ancestors/i.test(csp);
  add({ id: "frame-options", category: "security", title: "Clickjacking protection", status: frameProtected ? "pass" : "fail", weight: 1, value: frameProtected ? "set" : "missing" });
  const server = headers.get("server") ?? "";
  const poweredBy = headers.get("x-powered-by") ?? "";
  const disclosure = /\d/.test(server) || !!poweredBy;
  add({ id: "server-disclosure", category: "security", title: "Server version hidden", status: disclosure ? "warn" : "pass", weight: 1, value: [server, poweredBy].filter(Boolean).join(" / ") || "hidden" });

  // ---------------- Best practices ----------------
  add({ id: "doctype", category: "best_practices", title: "HTML5 doctype", status: /^\s*<!doctype html>/i.test(html) ? "pass" : "warn", weight: 1 });
  add({ id: "charset", category: "best_practices", title: "Character encoding declared", status: $("meta[charset]").length || /charset=/i.test(headers.get("content-type") ?? "") ? "pass" : "warn", weight: 1 });
  if (isHttps) {
    const mixed = $("img[src^='http:'], script[src^='http:'], link[href^='http:'][rel=stylesheet], iframe[src^='http:']").length;
    add({ id: "mixed-content", category: "best_practices", title: "No mixed content", status: mixed === 0 ? "pass" : "fail", weight: 2, value: `${mixed} insecure resources` });
  }
  add({ id: "redirects", category: "best_practices", title: "Minimal redirects", status: redirects.length <= 1 ? "pass" : redirects.length <= 3 ? "warn" : "fail", weight: 1, value: `${redirects.length} redirect(s)` });
  // ---------------- Mobile ----------------
  const viewport = $('meta[name="viewport"]').attr("content") ?? "";
  add({ id: "viewport", category: "mobile", title: "Mobile viewport tag", status: /width=device-width/i.test(viewport) ? "pass" : "fail", weight: 4, value: viewport || "missing" });
  if (viewport) {
    const zoomDisabled = /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?(\s|,|$)/i.test(viewport);
    add({ id: "zoom-disabled", category: "mobile", title: "Pinch-zoom allowed", status: zoomDisabled ? "warn" : "pass", weight: 1 });
  }
  add({ id: "apple-touch-icon", category: "mobile", title: "Apple touch icon", status: $('link[rel="apple-touch-icon"]').length ? "pass" : "info", weight: 0 });

  // ---------------- Content ----------------
  const $content = cheerio.load(html);
  $content("script, style, noscript, svg, template").remove();
  const bodyText = $content("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(" ").length : 0;
  add({ id: "thin-content", category: "content", title: "Enough page content", status: wordCount >= 300 ? "pass" : wordCount >= 150 ? "warn" : "fail", weight: 2, value: `${wordCount} words` });
  const reading = fleschReadingEase(bodyText);
  if (reading != null) {
    add({ id: "readability", category: "content", title: "Readability (Flesch score)", status: reading >= 50 ? "pass" : reading >= 30 ? "warn" : "fail", weight: 1, value: `${Math.round(reading)} / 100` });
  }
  const ctaPattern = /\b(get started|sign up|start|buy|shop|book|contact|subscribe|try|order|download|join|request|schedule)\b/i;
  const hasCta = $("a, button").toArray().some((el) => ctaPattern.test($(el).text()));
  add({ id: "cta", category: "content", title: "Clear call to action", status: hasCta ? "pass" : "warn", weight: 1 });
  const hasContact = /mailto:|tel:/i.test(html) || $("a").toArray().some((el) => /contact/i.test($(el).text() + ($(el).attr("href") ?? "")));
  add({ id: "contact-info", category: "content", title: "Contact information", status: hasContact ? "pass" : "warn", weight: 1 });
  const hasPrivacy = $("a").toArray().some((el) => /privacy/i.test($(el).text() + ($(el).attr("href") ?? "")));
  add({ id: "privacy-policy", category: "content", title: "Privacy policy link", status: hasPrivacy ? "pass" : "warn", weight: 1 });

  // ---------------- Scoring ----------------
  const categories = Object.fromEntries(
    (Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => {
      const catChecks = checks.filter((c) => c.category === cat);
      const scored = catChecks.filter((c) => c.status !== "info" && c.weight > 0);
      const totalWeight = scored.reduce((s, c) => s + c.weight, 0);
      const score = totalWeight ? Math.round((scored.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight) * 100) : 100;
      return [cat, { score, checks: catChecks } satisfies CategoryResult];
    }),
  ) as Record<Category, CategoryResult>;

  const overallScore = Math.round(
    (Object.keys(CATEGORY_WEIGHTS) as Category[]).reduce((s, cat) => s + categories[cat].score * CATEGORY_WEIGHTS[cat], 0),
  );

  const seen = new Set<string>();
  const recommendations: Recommendation[] = checks
    .filter((c) => (c.status === "fail" || c.status === "warn") && RECOMMENDATIONS[c.id] && !seen.has(c.id) && seen.add(c.id))
    .map((c) => {
      const t = RECOMMENDATIONS[c.id];
      const severity = c.status === "fail" ? 1 : 0.6;
      const priority = (IMPACT_VALUE[t.impact] / EFFORT_VALUE[t.effort]) * severity * (0.5 + CATEGORY_WEIGHTS[c.category] * 2);
      return { id: c.id, category: c.category, title: t.title, impact: t.impact, effort: t.effort, why: t.why, how: t.how, priority: Math.round(priority * 100) / 100, source: "rules" as const };
    })
    .sort((a, b) => b.priority - a.priority);

  const missing = checks
    .filter((c) => c.status === "fail" && c.value && /missing|none|0 found/i.test(c.value))
    .map((c) => ({ id: c.id, title: c.title }));

  const report: Report = {
    url: startUrl.toString(),
    finalUrl: finalUrl.toString(),
    fetchedAt: new Date().toISOString(),
    device,
    overall: { score: overallScore, grade: grade(overallScore) },
    categories,
    metrics: {
      ttfbMs: Math.round(ttfbMs),
      htmlKb: Math.round(htmlKb),
      statusCode: response.status,
      redirects: redirects.length,
      requests,
      pageWeightKb,
    },
    missing,
    recommendations,
    techStack: TECH_RULES.filter((r) => r.test(html, headers)).map((r) => r.name),
    page: {
      title,
      description,
      h1: h1s[0] ?? null,
      wordCount,
      favicon: favicon ? new URL(favicon, finalUrl).toString() : null,
    },
    summary: null,
    sources: { ai: false },
  };

  const shortText = (el: Parameters<typeof $>[0]) => $(el).text().replace(/\s+/g, " ").trim();
  const review = await generateAiReview(report, checks, {
    headings: $("h1,h2,h3").toArray().map((el) => `${el.tagName.toUpperCase()}: ${shortText(el)}`).filter((h) => h.length > 4),
    visibleText: bodyText,
    ctas: [...new Set($("button, a.btn, a.button, a[class*='cta'], a[class*='button'], a[role=button], input[type=submit]").toArray().map((el) => shortText(el) || $(el).attr("value") || "").filter((t) => t && t.length < 60))],
    navLinks: [...new Set($("nav a, header a").toArray().map(shortText).filter((t) => t && t.length < 40))],
    images: images.length,
    forms: $("form").length,
  });

  if (review) {
    report.summary = review.summary;
    report.ai = { audience: review.audience, strengths: review.strengths };
    report.sources.ai = true;
    const aiRecs: Recommendation[] = review.issues.map((issue, i) => {
      const priority = (IMPACT_VALUE[issue.impact] / EFFORT_VALUE[issue.effort]) * 0.8 * (0.5 + CATEGORY_WEIGHTS[issue.category] * 2);
      return { ...issue, id: `ai-${i + 1}`, source: "ai", priority: Math.round(priority * 100) / 100 };
    });
    report.recommendations = [...report.recommendations, ...aiRecs].sort((a, b) => b.priority - a.priority);
  }
  return report;
}
