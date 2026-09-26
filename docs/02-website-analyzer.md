# 02 — Website Analyzer

## Goal

User pastes a URL. We return a clear report: how the site performs, every metric, what it's missing, and exactly how to fix it — ordered by what matters most.

## Inputs
- URL (required). Normalize: add `https://` if missing, strip tracking params, resolve redirects.
- Device: Mobile (default) / Desktop.
- Scan depth: **Single page** (free) or **Multi-page crawl** up to N pages (paid: 25 / 100 / 500).

## Data sources

| Source | Used for | Cost |
|--------|----------|------|
| **Lighthouse** (run in our worker via Playwright's Chromium) | Performance, accessibility, best practices, SEO audits; lab Core Web Vitals | Free (compute only) |
| **Google PageSpeed Insights API** | Backup/second opinion for Lighthouse; field data | Free (API key, 25k req/day) |
| **Chrome UX Report (CrUX) API** | Real-user Core Web Vitals (LCP, INP, CLS) for the origin, 28-day data | Free (API key) |
| **Our HTML crawler** (Playwright + Cheerio) | SEO tags, headings, links, images, structured data, content analysis | Free |
| **axe-core** | Detailed accessibility violations (WCAG 2.2) | Free (open source) |
| **HTTP header inspection** | Security headers, caching, compression, HTTP/2/3 | Free |
| **TLS/SSL check** (Node `tls`) | Certificate validity, expiry, protocol version | Free |
| **DNS lookups** (Node `dns`) | SPF, DMARC, DNSSEC presence, CDN detection | Free |
| **Wappalyzer-style fingerprints** (open-source `simple-wappalyzer` / own rules) | Tech stack detection (CMS, frameworks, analytics) | Free |
| **Google Safe Browsing API** | Malware/phishing flag | Free |
| **LLM** (GPT-4o-mini / Claude Haiku class) | Executive summary, content quality feedback, tailored fix instructions | ~$0.002–0.01 per scan |
| *(Later)* Moz / Ahrefs / DataForSEO API | Domain authority, backlinks, keyword rankings | Paid — phase 3 |

## Checks by category

### 1. Performance
- Lighthouse performance score.
- Core Web Vitals: **LCP, INP, CLS** (field from CrUX if available, else lab), plus **FCP, TTFB, TBT, Speed Index**.
- Total page weight, request count, breakdown by type (JS, CSS, images, fonts).
- Render-blocking resources.
- Unused JS/CSS (bytes).
- Image optimization: oversized images, missing modern formats (WebP/AVIF), missing `width/height`, missing lazy loading.
- Text compression (gzip/brotli), caching headers (`Cache-Control`), HTTP/2 or HTTP/3.
- Third-party script impact.
- CDN in use?

### 2. SEO (technical + on-page)
- `<title>` present, length 30–60 chars, unique.
- Meta description present, 70–160 chars.
- Exactly one `<h1>`; logical heading hierarchy.
- Canonical tag; `hreflang` if multilingual.
- `robots.txt` exists and doesn't block important pages; `meta robots` noindex detection.
- `sitemap.xml` exists, valid, referenced in robots.txt.
- Structured data (JSON-LD) present and valid (Organization, Product, Article, BreadcrumbList, etc.).
- Open Graph + Twitter Card tags (social sharing preview).
- Image `alt` attributes.
- Internal/external link counts; **broken links** (HEAD request each, 4xx/5xx).
- Redirect chains; `http → https` and `www` consistency.
- Friendly URLs (length, no query junk).
- Favicon present.
- Word count / thin content detection.
- Keyword focus (top n-grams vs title/H1 alignment).

### 3. Accessibility
- Lighthouse a11y score.
- axe-core violations grouped by severity (critical/serious/moderate/minor) with the failing element selectors.
- Color contrast, form labels, button names, `lang` attribute, landmarks, keyboard focus.

### 4. Best Practices
- HTTPS everywhere, no mixed content.
- Console errors on load.
- Deprecated APIs, vulnerable JS libraries (Lighthouse + known-vuln list).
- Correct doctype, charset.

### 5. Security
- SSL certificate valid, days until expiry, TLS version ≥ 1.2.
- Security headers: `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`.
- Cookies: `Secure`, `HttpOnly`, `SameSite`.
- Server/version disclosure headers.
- Safe Browsing status.
- Email domain security: SPF, DMARC records.

### 6. Mobile
- Viewport meta tag.
- Tap target sizes, font sizes (Lighthouse).
- Mobile screenshot + desktop screenshot (stored in Supabase Storage).
- Horizontal scroll detection.

### 7. Content quality (LLM-assisted)
- Readability score (Flesch-Kincaid).
- Clarity of value proposition above the fold.
- Clear call-to-action present?
- Trust signals: contact info, privacy policy, terms, testimonials.
- Spelling/grammar issues (sample).
- Optionally: AI-content score of main text using our detector (cross-feature hook).

### 8. Tech stack (informational)
- CMS / framework / hosting / CDN / analytics / ad tech detected.

## Scoring

- Each check produces: `status` (pass / warn / fail / info), `score` (0–1), `weight`.
- **Category score** = weighted average × 100.
- **Overall score** = weighted average of categories:

| Category | Weight |
|----------|--------|
| Performance | 25% |
| SEO | 25% |
| Accessibility | 15% |
| Security | 15% |
| Best Practices | 10% |
| Mobile | 5% |
| Content | 5% |

- Grades: A (90–100), B (80–89), C (65–79), D (50–64), F (<50).
- Weights live in `packages/shared/scoring.ts` so they're easy to tune.

## Recommendations engine

1. **Rule-based first.** Every failed/warn check maps to a recommendation template in `recommendations.ts`:
   ```ts
   {
     id: "missing-meta-description",
     title: "Add a meta description",
     category: "seo",
     impact: "high",        // high | medium | low
     effort: "easy",        // easy | medium | hard
     why: "Search engines show this under your link...",
     how: ["Open your page's <head>", "Add <meta name=\"description\" content=\"...\">", "..."],
     platformHints: { wordpress: "Use Yoast/RankMath...", shopify: "Online Store → Preferences...", nextjs: "export const metadata = {...}" },
     docs: ["https://developers.google.com/search/docs/appearance/snippet"]
   }
   ```
2. **Priority** = impact × (1 / effort) × category weight → sort descending. Top 5 = "Fix these first".
3. **Platform-aware.** If tech detection finds WordPress/Shopify/Wix/Next.js, show platform-specific steps.
4. **LLM layer.** Send the structured results (not the raw HTML) to the LLM to produce:
   - A 4–6 sentence executive summary.
   - Rewritten suggestions for title/meta description based on page content.
   - Content & conversion feedback.
   LLM output is constrained with a JSON schema and never invents metrics — it only explains numbers we give it.

## Worker pipeline

```
job received
 ├─ validate & resolve URL (SSRF guard, follow redirects ≤ 5)
 ├─ parallel:
 │   ├─ Lighthouse (mobile or desktop)         ~15–30s
 │   ├─ CrUX API + PSI API                     ~2–10s
 │   ├─ Playwright render → HTML, screenshots  ~5s
 │   ├─ headers / TLS / DNS / robots / sitemap ~2s
 │   └─ Safe Browsing                          ~1s
 ├─ HTML analysis (Cheerio) + axe-core
 ├─ broken link check (capped at 100 links, concurrency 10)
 ├─ tech detection
 ├─ scoring
 ├─ recommendations (rules)
 ├─ LLM summary
 └─ save results, status=completed
```
- Update `scans.progress` (0–100) and `scans.stage` after each step for the live progress bar.
- Timeouts: 90s hard limit per scan; partial results saved if some checks fail (each check is isolated with try/catch and marked `error`).
- Multi-page crawl: BFS over same-origin links, respect robots.txt, max depth 3, 1 req/sec per host, run lightweight checks on every page and Lighthouse only on the top ~5 pages.

## Report output (stored as JSON)

```json
{
  "url": "https://example.com",
  "fetchedAt": "2026-09-26T20:00:00Z",
  "device": "mobile",
  "overall": { "score": 72, "grade": "C" },
  "categories": {
    "performance": { "score": 58, "checks": [ ... ] },
    "seo":         { "score": 81, "checks": [ ... ] }
  },
  "metrics": { "lcp": 3.4, "inp": 180, "cls": 0.05, "ttfb": 0.9, "pageWeightKb": 2890, "requests": 94 },
  "missing": ["meta-description", "sitemap", "hsts-header", "og-image"],
  "recommendations": [ { "id": "...", "priority": 0.92, ... } ],
  "techStack": ["WordPress", "Cloudflare", "Google Analytics"],
  "screenshots": { "mobile": "storage/path.png", "desktop": "storage/path.png" },
  "summary": "Your site loads slowly on mobile mainly because..."
}
```

## Extra features (phase 2+)
- Scheduled monitoring (weekly re-scan + email if score drops).
- Competitor comparison (scan 2–3 URLs side by side).
- White-label PDF reports for agencies.
- Backlink / domain authority via DataForSEO.

## What you need for this feature
- Google Cloud project with **PageSpeed Insights API**, **CrUX API**, **Safe Browsing API** enabled → one API key.
- LLM API key (OpenAI or Anthropic).
- Worker host that can run headless Chrome (Railway / Fly.io / Render, ≥ 2 GB RAM per instance).
- Supabase Storage bucket `screenshots`.
- npm packages: `playwright`, `lighthouse`, `chrome-launcher`, `cheerio`, `axe-core`, `@axe-core/playwright`, `robots-parser`, `sitemapper`, `p-limit`, `zod`.
