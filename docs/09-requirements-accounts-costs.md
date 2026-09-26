# 09 — Requirements, Accounts & Costs

Everything to sign up for, install, and configure — grouped by feature.

## Accounts / services

| Service | Needed for | Required in | Est. monthly cost (early stage) |
|---------|-----------|-------------|--------------------------------|
| **Supabase** | DB, auth, storage, realtime, queue | v1 | Free → $25 (Pro) |
| **Vercel** | Host Next.js | v1 | Free → $20 (Pro) |
| **Railway / Fly.io / Render** | Scan worker (headless Chrome) | v1 | $10–40 |
| **Google Cloud** | PageSpeed Insights, CrUX, Safe Browsing APIs, Google OAuth | v1 | Free |
| **OpenAI and/or Anthropic** | Humanizer (v1), report summaries, synthetic training data | v1 | $20–200 (usage-based) |
| **Modal / RunPod / HF Inference Endpoints** | GPU for detector model (+ later rewrite model) | v1 | $30–300 (scale-to-zero helps) |
| **Hugging Face** | Datasets, private model hosting | v1 | Free → $9 |
| **Upstash Redis** | Rate limiting, caching | v1 | Free → $10 |
| **Stripe** | Payments | v1 | 2.9% + 30¢ per transaction |
| **Resend** | Transactional email | v1 | Free → $20 |
| **Sentry** | Error tracking | v1 | Free |
| **PostHog** | Product analytics | v1 | Free |
| **Domain name** | e.g. lucenta.app | v1 | ~$15/year |
| **Detector APIs for benchmarking**: GPTZero, Originality.ai, Copyleaks, Winston AI, Sapling | Humanizer ≤20% benchmark | v1 (benchmark) | $50–150 total |
| **LanguageTool** (self-host via Docker or API) | Grammar gate in humanizer | v1 | Free (self-host) |
| **GPU for training** (RunPod / Lambda / Modal) | Train detector + fine-tune rewrite model | v1 detector, v2 rewriter | $50–300 per training run |
| DataForSEO / Moz | Backlinks, domain authority | Phase 3 | $50+ |
| Social data provider + platform dev accounts | Profile analyzer | Deferred | TBD |

**Rough early-stage total:** ~$150–600/month plus one-off training costs, mostly driven by LLM and GPU usage.

## Environment variables

### `apps/web/.env.local`
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server only
ML_SERVICE_URL=
ML_SERVICE_INTERNAL_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
SENTRY_DSN=
NEXT_PUBLIC_APP_URL=
```

### `apps/scan-worker/.env`
```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_API_KEY=                     # PSI + CrUX + Safe Browsing
OPENAI_API_KEY=                     # or ANTHROPIC_API_KEY
WORKER_CONCURRENCY=2
SCAN_TIMEOUT_MS=90000
```

### `apps/ml-service/.env`
```bash
INTERNAL_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
HF_TOKEN=
DETECTOR_MODEL_ID=                  # e.g. your-org/lucenta-detector-v1
PPL_MODEL_ID=                       # perplexity/observer model
REWRITER_MODEL_ID=                  # phase 2 fine-tuned model
LANGUAGETOOL_URL=
EMBEDDING_MODEL_ID=
```

### `benchmarks/.env`
```bash
GPTZERO_API_KEY=
ORIGINALITY_API_KEY=
COPYLEAKS_EMAIL=
COPYLEAKS_API_KEY=
WINSTON_API_KEY=
SAPLING_API_KEY=
```

## Local development tools
- Node.js 20+ and **pnpm**
- Python 3.11+ and `uv` or `poetry`
- **Supabase CLI** + Docker Desktop (local Supabase stack, LanguageTool container)
- Playwright browsers: `pnpm exec playwright install chromium`
- Stripe CLI (to forward webhooks locally)
- Git + GitHub (or Cursor-hosted repo)

## Skills / roles needed
| Area | Skill |
|------|-------|
| Web app | Next.js, TypeScript, Tailwind, Supabase |
| Scan worker | Node.js, Playwright, Lighthouse, web performance/SEO knowledge |
| ML | Python, PyTorch, Hugging Face, model evaluation, LLM prompting, fine-tuning (LoRA/DPO) |
| DevOps | Docker, deploying workers & GPU services, monitoring |
| Product | Copywriting, SEO for our own landing pages, pricing |
