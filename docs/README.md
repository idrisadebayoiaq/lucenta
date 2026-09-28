# Lucenta — Planning Documentation

Lucenta is a web app with three analysis tools:

1. **Website Analyzer** — paste a URL, get performance, SEO, accessibility, security, and content metrics, a list of what the site is lacking, and prioritized fixes.
2. **AI Text Detector + Humanizer** — paste text, get an AI-likelihood score with sentence-level highlights, then rewrite it into natural human-sounding text.
3. **Social Profile Analyzer** — *deferred to a later phase* (planned, not built in v1).

## Document index

| # | Document | What it covers |
|---|----------|----------------|
| 00 | [Product Overview](./00-product-overview.md) | Vision, users, features, scope of v1 |
| 01 | [Architecture](./01-architecture.md) | Tech stack, system design, how the pieces talk |
| 02 | [Website Analyzer](./02-website-analyzer.md) | Every check, data sources, scoring, recommendations |
| 03 | [AI Detector & Humanizer](./03-ai-detector-and-humanizer.md) | Detection models, rewrite pipeline, the ≤20% target and how to measure it |
| 04 | [Profile Analyzer (Deferred)](./04-profile-analyzer.md) | Future design so v1 doesn't block it |
| 05 | [Database Schema](./05-database-schema.md) | Supabase tables, RLS, storage |
| 06 | [API Specification](./06-api-spec.md) | Internal endpoints, request/response shapes |
| 07 | [Auth, Plans & Billing](./07-auth-plans-billing.md) | Accounts, usage limits, Stripe |
| 08 | [Frontend & UX](./08-frontend-ux.md) | Pages, components, report UI |
| 09 | [Requirements, Accounts & Costs](./09-requirements-accounts-costs.md) | Every service, API key, env var, and estimated cost |
| 10 | [Testing & Quality](./10-testing-quality.md) | Test strategy, detector benchmark harness |
| 11 | [Security, Privacy & Legal](./11-security-privacy-legal.md) | SSRF, data retention, ToS, acceptable use |
| 12 | [Roadmap](./12-roadmap.md) | Phased build plan with milestones |
| 13 | [Implementation Plan](./13-implementation-plan.md) | Stage-by-stage build log |
| 14 | [Content Plan](./14-content-plan.md) | X + Instagram posting schedule, post details and status |

## Suggested reading order

Start with 00 → 01 → 12 for the big picture, then 02 and 03 for the core features, then 09 for what you need to sign up for before coding.
