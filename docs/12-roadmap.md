# 12 — Roadmap

Estimates assume 1–2 developers. Adjust as needed.

## Phase 0 — Setup (Week 1)
- [ ] Monorepo (pnpm + Turborepo): `apps/web`, `apps/scan-worker`, `apps/ml-service`, `packages/shared`
- [ ] Supabase project: migrations for tables in doc 05, RLS, `pgmq`, storage buckets
- [ ] Next.js app with Tailwind + shadcn/ui, Supabase auth (email + Google)
- [ ] Sign up for accounts in doc 09, fill env vars
- [ ] CI pipeline (lint, typecheck, test)

## Phase 1 — Website Analyzer MVP (Weeks 2–4)
- [ ] URL normalization + SSRF guard (with tests)
- [ ] Scan worker: queue consumer, Playwright render, Lighthouse, headers/TLS/DNS, robots/sitemap
- [ ] HTML/SEO checks, axe-core, broken links, tech detection
- [ ] PSI + CrUX + Safe Browsing integration
- [ ] Scoring + rule-based recommendations (≥ 60 recommendation templates)
- [ ] LLM executive summary
- [ ] Report UI with live progress (Realtime)
- [ ] Scan history in dashboard
- **Milestone:** anyone can scan a URL and get a full report in < 60s.

## Phase 2 — AI Detector (Weeks 4–7, can overlap Phase 1)
- [ ] Collect datasets (RAID, HC3, M4) + generate own multi-model dataset
- [ ] Baseline: perplexity + burstiness + Binoculars zero-shot score
- [ ] Fine-tune DeBERTa classifier; train meta-model; calibrate
- [ ] Sentence-level scoring
- [ ] FastAPI ML service deployed on GPU host
- [ ] Detector UI with highlights + explanations; file upload
- **Milestone:** detector with FPR < 3% on human test set.

## Phase 3 — Humanizer v1 (Weeks 7–9)
- [ ] LLM-based rewrite pipeline with protected spans, post-processing, quality gates
- [ ] Detector feedback loop (max 3 iterations)
- [ ] Tones + strength controls, SSE streaming, diff view
- [ ] Benchmark harness + first run against paid detectors
- **Milestone:** first benchmark report; identify gap to the ≥ 90% @ ≤ 20% target.

## Phase 4 — Monetization & Launch (Weeks 9–11)
- [ ] Plans, quotas, Stripe checkout + portal + webhooks
- [ ] PDF export, share links
- [ ] Landing pages (SEO), pricing, legal pages, blog setup
- [ ] Sentry, PostHog, rate limits, captcha
- [ ] Load testing, security review
- **Milestone:** public launch (Product Hunt, relevant communities).

## Phase 5 — Humanizer v2: own rewrite model (Weeks 11–16)
- [ ] Build (AI → human) paired dataset, 50k–200k pairs
- [ ] LoRA fine-tune open 7–8B model; DPO with detector-based ranking
- [ ] Self-host on GPU; A/B against LLM-API pipeline
- [ ] Weekly benchmark + automated alerting; retraining loop
- **Milestone:** ≥ 90% of benchmark samples ≤ 20% on every tracked detector, lower cost per word.

## Phase 6 — Growth features (after launch)
- [ ] Scheduled monitoring + email alerts
- [ ] Competitor comparison
- [ ] White-label agency reports, team seats
- [ ] Backlinks / domain authority (DataForSEO)
- [ ] Multi-language detector + humanizer
- [ ] Chrome extension (detect/humanize anywhere)
- [x] Public API (v1: audits, detection, usage, webhooks; see [15-developer-api.md](./15-developer-api.md))

## Phase 7 — Social Profile Analyzer
- See [04-profile-analyzer.md](./04-profile-analyzer.md).
