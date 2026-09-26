# 10 — Testing & Quality

## Test layers

| Layer | Tool | What |
|-------|------|------|
| Unit | Vitest (TS), pytest (Python) | Scoring math, URL normalization, SSRF guard, recommendation mapping, post-processing rules, quota logic |
| Integration | Vitest + local Supabase | API routes with real DB + RLS policies, Stripe webhook handling (Stripe CLI fixtures) |
| Worker | Vitest + fixture sites | Run checks against local static fixture sites with known issues (missing meta, huge images, no HTTPS headers) and assert results |
| E2E | Playwright | Sign up → scan URL → see report; detect → humanize → copy; upgrade flow in Stripe test mode |
| ML eval | pytest + notebooks | Detector metrics, humanizer quality gates |
| Load | k6 | 50 concurrent scans, 200 concurrent detections |

## Website analyzer accuracy
- Keep a **golden set of ~30 real URLs** (fast sites, slow sites, WordPress, Shopify, SPA, broken sites). Compare our scores against PageSpeed Insights and manual review; alert when our Lighthouse scores drift > 10 points from PSI.
- Fixture sites in `apps/scan-worker/test/fixtures/` each designed to fail specific checks.

## Detector evaluation
- Held-out test set split by **domain** and by **generator model** (include models not seen in training).
- Track: AUROC, accuracy, **false-positive rate on human text** (target < 3%), false-negative rate, calibration error.
- Test on non-native English human writing specifically (detectors often wrongly flag it — we must not).
- Re-evaluate on every model version; results logged to `benchmark_runs`.

## Humanizer benchmark harness (the ≤20% target)

Location: `benchmarks/humanizer/`

### Dataset
- **500 AI-generated samples** (fixed, versioned), spread across:
  - Genres: essay, blog post, product description, email, social caption, academic abstract, news-style, story.
  - Lengths: 150, 300, 600, 1,000 words.
  - Source models: GPT-4o/GPT-5-class, Claude, Gemini, Llama, DeepSeek, Mistral.
- Plus **200 human samples** as a control (to confirm each detector behaves sanely).

### Procedure (automated, weekly + on every rewrite-model change)
1. Run each AI sample through the humanizer (Balanced mode, and separately Aggressive).
2. Send original + humanized text to every detector API we have keys for (GPTZero, Originality.ai, Copyleaks, Winston, Sapling, ZeroGPT if available). Respect rate limits and ToS.
3. Record per-detector AI score for before/after.
4. Also compute meaning similarity, grammar error count, length ratio.

### Metrics & pass criteria
| Metric | Target |
|--------|--------|
| % of samples with AI score ≤ 20% — **per detector** | ≥ 90% |
| Median AI score after humanizing — per detector | ≤ 10% |
| Mean semantic similarity | ≥ 0.85 |
| Grammar errors per 100 words (LanguageTool) | ≤ original + 0.5 |
| Protected spans preserved (numbers, names, quotes) | 100% |

### Output
- Report written to `benchmark_runs` + a markdown summary in `benchmarks/reports/YYYY-MM-DD.md`.
- Internal admin dashboard page showing pass rate trend per detector.
- **Alert** (email/Slack) if any detector's pass rate drops below 90% → triggers a rewrite-model refresh cycle (doc 03, Part B, "Training our own rewrite model").

### Manual checks
- Turnitin: no public API — spot-check monthly via institutional access if available; never claim results we can't verify.
- Human readability review: 20 random outputs/week rated 1–5 by a person for naturalness and correctness.

## CI (GitHub Actions)
- On PR: lint (ESLint, Ruff), typecheck, unit + integration tests, build.
- On main: deploy web to Vercel, worker + ML service via Docker images.
- Nightly: golden-URL drift check. Weekly: humanizer benchmark.
