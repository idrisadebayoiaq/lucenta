# 13 — Step-by-Step Implementation Plan

Follow the steps in order. Each step lists what to build, where it lives, and how to know it's done. Steps marked **[keys later]** are built fully but only start working once the related API key is added to `apps/web/.env`.

Legend: ✅ built and tested end-to-end in the browser · ⬜ to do

---

## Stage 1 — Project foundation

### Step 1.1 — Create the web app ✅
- Next.js (App Router, TypeScript, Tailwind CSS, `src/` dir) in `apps/web`.
- UI kit: shadcn/ui components (button, input, card, tabs, dialog, dropdown, badge, progress, textarea, select, avatar, sonner toasts, etc.), `lucide-react` icons.
- Done when: `pnpm dev` inside `apps/web` shows the landing page at `http://localhost:3000`.

### Step 1.2 — Environment variables ✅
- `apps/web/.env` (git-ignored, holds real keys) and `apps/web/.env.example` (committed template). Don't add a `.env.local` with blank values — it overrides `.env`.
- Supabase URL + keys and `OPENROUTER_API_KEY` are filled in; the rest are added later.

### Step 1.3 — Supabase clients ✅
- `src/lib/supabase/client.ts` (browser), `server.ts` (server components/route handlers), `proxy.ts` (session refresh + route protection).
- `src/proxy.ts` (Next.js 16's replacement for `middleware.ts`) protects `/dashboard/**` and redirects logged-in users away from `/login`, `/signup` and `/forgot-password`.

---

## Stage 2 — Database (Supabase)

### Step 2.1 — Core tables ✅
Migration `supabase/migrations/0001_initial_schema.sql`:
- `profiles` (extended with `username`, `bio`, `company`, `website`, `job_title`, `location`, `avatar_url`, `plan`, preferences)
- `subscriptions`, `usage`, `scans`, `scan_results`, `scan_pages`, `text_checks`, `benchmark_runs`
- Trigger `on_auth_user_created` → auto-creates a `profiles` row on signup
- `updated_at` triggers
- Function `delete_current_user()` → lets a user delete their own account
- Function `increment_usage()` → atomic quota counter

### Step 2.2 — Row Level Security ✅
- RLS on every table. Users can read/update only their own profile and read/delete only their own scans and text checks.
- `benchmark_runs` is service-role only.
- `0002_harden_increment_usage.sql`: quota limit comes from the user's plan, never from the caller.
- `0003_table_grants.sql`: this Supabase project doesn't auto-grant table privileges to `anon`/`authenticated`, so every table needs explicit `grant`s matching its policies. **Any new table needs grants too**, or queries silently return nothing.

### Step 2.3 — Storage ✅
- Buckets: `avatars` (public read, user writes only into their own folder), `screenshots`, `reports`, `uploads` (private).
- `0004_avatar_cleanup.sql`: users can list their own avatar folder (needed to clean up old photos). Storage rows can't be deleted with SQL, so files are removed through the Storage API before `delete_current_user()` runs.

### Step 2.4 — Generate TypeScript types ✅
- `src/lib/supabase/database.types.ts`. Regenerate after every migration.

---

## Stage 3 — Authentication

### Step 3.1 — Sign up page ✅ (`/signup`)
- Full name, email, password, confirm password.
- **Show/hide password toggle** (eye icon) on both password fields.
- Live password strength meter + rules (8+ chars, upper, lower, number, symbol — matches the Supabase Auth password policy).
- Google sign-in button (works once Google OAuth is enabled in Supabase).
- Email confirmation message after signup.

### Step 3.2 — Login page ✅ (`/login`)
- Email + password with **show/hide toggle**, "Remember me" handled by Supabase session.
- Google sign-in button, link to forgot password.

### Step 3.3 — Forgot / reset password ✅
- `/forgot-password` sends reset email → `/reset-password` sets a new password (show/hide toggles).

### Step 3.4 — Auth callback & sign out ✅
- `/auth/callback` exchanges OAuth/email codes for a session.
- Sign out from the user menu.

### Step 3.5 — Supabase dashboard settings ⬜ (manual)
- Authentication → URL Configuration: Site URL `http://localhost:3000`, add redirect `http://localhost:3000/auth/callback` (and production URL later).
- Authentication → Providers → Google: add Client ID/Secret from Google Cloud.
- Optional: customize email templates, set up Resend SMTP.

---

## Stage 4 — Public pages

### Step 4.1 — Landing page ✅ (`/`)
- Hero with URL input (→ website analyzer) and quick links to AI detector/humanizer; feature sections; how-it-works; pricing teaser; FAQ; footer.

### Step 4.2 — Pricing page ✅ (`/pricing`)
### Step 4.3 — Legal pages ✅ (`/legal/terms`, `/legal/privacy`, `/legal/acceptable-use`) — placeholder text, have a lawyer review.

---

## Stage 5 — Dashboard shell

### Step 5.1 — Layout ✅
- Sidebar (Overview, Website Analyzer, AI Detector, Humanizer, History, Profile, Settings) + top bar with user menu; collapses to a sheet on mobile.

### Step 5.2 — Overview page ✅ (`/dashboard`)
- Welcome, usage meters (from `usage` + plan limits), recent scans, recent text checks, quick actions.

---

## Stage 6 — Profile (full CRUD)

### Step 6.1 — Create ✅ — profile row created automatically by DB trigger at signup.
### Step 6.2 — Read ✅ — `/dashboard/profile` shows avatar, name, username, bio, company, job title, website, location, plan, member since.
### Step 6.3 — Update ✅
- Edit form (server action + zod validation), avatar upload/remove (Supabase Storage `avatars`), change email, change password (with show/hide toggles).
### Step 6.4 — Delete ✅
- "Danger zone": delete all history (scans + text checks), delete account (typed confirmation → `delete_current_user()` → signed out).

---

## Stage 7 — Website Analyzer

### Step 7.1 — UI ✅
- `/dashboard/analyzer`: URL input + device selector → creates scan.
- `/dashboard/analyzer/[id]`: score ring, category scores, metrics, "what's missing", prioritized recommendations with how-to-fix, all checks per category tab, delete + re-scan.

### Step 7.2 — Built-in analyzer (no keys needed) ✅
- `src/lib/analyzer/*`: SSRF-safe fetch, HTML/SEO checks, security headers, HTTPS, robots.txt, sitemap, images/alt, links, Open Graph, structured data, mobile viewport, content/readability, tech detection, scoring, recommendations.
- `POST /api/scans` runs it and saves results to `scans` + `scan_results`.

### Step 7.3 — Page weight & requests (no Google API) ✅
- Google PageSpeed was removed. The analyzer fetches the page's scripts, stylesheets, images and embeds (up to 40, HEAD `Content-Length` or a capped GET) to measure total page weight, request count and oversized files (>300 KB).

### Step 7.4 — AI review ✅
- `src/lib/analyzer/summary.ts` → `generateAiReview()` sends check results + the page's headings, navigation, CTAs and visible text to the fast model (`OPENROUTER_FAST_MODEL`, Gemini 2.5 Flash-Lite, ~$0.10/$0.40 per 1M tokens — well under $0.001 per scan).
- Returns a summary, target audience, strengths and 3–6 content/UX/conversion issues. Issues are merged into the recommendations with an "AI insight" badge; AI issues that repeat a rule-based topic (speed, security headers, images, headings…) are filtered out in code.

### Step 7.4b — Hire a developer ✅
- `developers` table (migration 0005), seeded with the first listed developer (WhatsApp, call, email, portfolio, social links).
- Every report ends with a "Want an expert to fix these issues?" card; WhatsApp and email links are pre-filled with the audited site. Public profiles at `/developers`.

### Step 7.5 — Dedicated scan worker ⬜
- Move scans to `apps/scan-worker` (Playwright + Lighthouse + axe-core) using a `pgmq` queue, with live progress through Supabase Realtime. See doc 02.

### Step 7.6 — PDF export, share links, compare, monitoring ⬜

---

## Stage 8 — AI Detector

### Step 8.1 — UI ✅ (`/dashboard/detector`)
- Text editor with word count, gauge, label, sentence highlights, "why" signals, send-to-humanizer button.

### Step 8.2 — Heuristic detector (no keys) ✅
- `src/lib/detector/heuristic.ts`: burstiness, sentence-length variance, AI-phrase density, lexical diversity, punctuation patterns → score. Placeholder until the ML model is ready.

### Step 8.3 — ML service **[keys later]** ⬜
- `apps/ml-service` (FastAPI): trained classifier + perplexity/Binoculars. When `ML_SERVICE_URL` is set, `/api/detect` uses it instead of the heuristic. See doc 03.

### Step 8.4 — File upload (.txt/.docx/.pdf) ⬜

---

## Stage 9 — Humanizer

### Step 9.1 — UI ✅ (`/dashboard/humanizer`)
- Input/output panes, tone + strength selectors, keep-words, copy, diff toggle.
- **Check AI score** button on the result: runs the detector on the humanized text (free — doesn't use a daily text) and shows the new gauge, label, highlights and reasons.

### Step 9.2 — LLM rewrite ✅
- `POST /api/humanize` calls OpenRouter (`OPENROUTER_MODEL`, default `meta-llama/llama-3.3-70b-instruct:nitro`, $0.10/$0.32 per 1M tokens) or OpenAI as a fallback, with the style prompt + post-processing + self-detection loop (up to 3 passes). Each retry feeds back the detector's flagged sentences, AI phrases and reasons.
- Benchmark (average humanized score on our detector, lower is better): Llama 3.3 70B **13%**, Claude Sonnet 4 15% (~30× the price), Mistral Small 3.2 31%, Qwen3 235B / DeepSeek V3.1 / gpt-4.1-nano 37%, Gemini 2.5 Flash-Lite 41%, gpt-4o-mini 58%.

### Step 9.3 — Meaning check ✅ · grammar gate, own rewrite model, benchmark harness ⬜ (doc 03 + doc 10)
- Meaning is judged by a cheap LLM call (`OPENROUTER_FAST_MODEL`, default `google/gemini-2.5-flash-lite`), which also flags added claims. A rewrite only "passes" with ≥75% meaning and no invented facts.
- Still to do: verify the ≤20% target against real external detectors (GPTZero, Originality.ai, Turnitin) with the benchmark harness in doc 10 — our heuristic detector is only a proxy.

---

## Stage 10 — History & settings

### Step 10.1 — History ✅ (`/dashboard/history`) — all scans and text checks, filter by type, view, delete (single + bulk).
### Step 10.2 — Settings ✅ (`/dashboard/settings`) — theme (dark by default), save-history toggle, email notifications toggle, "Your free limits" card.

---

## Stage 11 — Free daily limits ✅ (billing postponed)
- No paid plans for now; `/pricing` was removed. Limits live in `src/lib/limits.ts` and migration 0005:
  - **5 texts per day** (UTC) shared by the detector and humanizer, **max 3,000 characters** each. A "text" is identified by a SHA-256 of its normalized content, so re-checking or re-humanizing the same text is free. Humanized outputs are registered server-side (service role) as derived rows, so checking them is free too.
  - **5 website audits per day** via `consume_daily_scan()`.
- The old `increment_usage()` RPC is revoked (migration 0006). Stripe billing can be added later on top of these limits.

## Stage 11c — Marketing website & speed ✅
- Public pages (no signup needed): `/` (home), `/tools` (every tool in detail + "Coming soon" roadmap from `src/lib/tools.ts`), `/about`, `/developers`, legal pages. The dashboard still requires an account; it has a "Home" link back to the marketing site.
- Marketing pages are **static** (revalidated hourly). Auth state is read in the browser (`AuthStatusProvider` in `src/components/auth-state.tsx`), so signed-in visitors see "Dashboard / Go to dashboard" instead of Log in / Sign up, without making the pages dynamic.
- The auth proxy only runs on `/dashboard`, auth pages, `/auth/*` and `/api/*`, and uses `getClaims()` (local JWT check) instead of a network `getUser()` call. Public data (developers) uses a cookie-less client (`src/lib/supabase/public.ts`).
- Founder photo from quoreestack.online is served from `public/developers/` through `next/image` (AVIF/WebP, ~1–3 KB).

## Stage 11b — X (Twitter) theme ✅
- Palette in `globals.css`: black `#000` / text `#e7e9ea` / borders `#2f3336` / muted `#71767b` in dark (default), white / `#0f1419` in light, X blue `#1d9bf0` accent. Pill buttons, bold type, system font stack, X-style sidebar navigation.

## Stage 11d — Legal pages & responsible use ✅
- `/terms` (Terms of Use), `/privacy` (Privacy Policy, NDPA 2023 + GDPR) and `/responsible-use` (Responsible Use Policy), all built on `src/components/legal-document.tsx`. Old `/legal/*` URLs permanently redirect (`next.config.ts`).
- Positioning: the Detector gives estimates, never proof, and must not be the only evidence against anyone; the Humanizer is for polishing writing you're allowed to improve — not academic dishonesty, hiding required AI disclosure, plagiarism or deception. We never market "undetectable" text or detector bypassing.
- Surfaced in-product: `ResponsibleUseNote` on the Detector and Humanizer pages, signup agreement covers all three documents, home FAQ "Can I use Lucenta for school work?", softened tool copy in `src/lib/tools.ts`.
- Review the documents with a lawyer before launch.

## Stage 11e — Founder details removed ✅
- No founder section on About, no "Built by" footer credit, no Founder badge. The seeded developer stays listed as a regular developer (migration `0008_developer_not_founder.sql`: headline "Full Stack Developer", `is_owner = false`).
- Coming soon: Social Profile Analyzer and Developer accounts (developers sign up with their details and get suggested on website reports, ranked by the report's performance, results and issues).

## Stage 11f — Age check & one account per device ✅
- Date of birth at signup (`src/lib/age.ts`, minimum age 16), stored in `profiles.birth_date` (migration 0009). Google users and older accounts without it are sent to `/complete-profile` before the dashboard.
- `account_devices` table (service-role only) stores HMAC hashes of a device ID (httpOnly cookie `lc_did` + localStorage copy) and the client IP. `src/lib/account-guard.ts`:
  - Signup is refused if the device already has an account (forever, even after the account is deleted).
  - Signup is refused if the IP created `SIGNUP_MAX_ACCOUNTS_PER_IP` accounts (default 1) in the last `SIGNUP_IP_WINDOW_DAYS` (default 30). Private/localhost IPs are skipped.
  - New Google accounts from a blocked device/IP are deleted in `/auth/callback`. Logins record the device too.
- Env: `SIGNUP_HASH_SECRET` (keep it stable — changing it invalidates existing hashes).

## Stage 12 — Hardening & launch ⬜
- Rate limiting (Upstash), captcha on anonymous usage, Sentry, PostHog, E2E tests (Playwright), load test, SEO metadata/sitemap for our own site, deploy to Vercel, point domain.

---

## Keys to add later (checklist)

| Variable | Unlocks |
|----------|---------|
| `OPENROUTER_API_KEY` ✅ added (or `OPENAI_API_KEY`) | Humanizer + AI website review |
| `OPENROUTER_MODEL` / `OPENROUTER_FAST_MODEL` ✅ | Llama 3.3 70B (humanizer) / Gemini 2.5 Flash-Lite (meaning judge + website review) |
| `ML_SERVICE_URL`, `ML_SERVICE_INTERNAL_KEY` | Real ML detector instead of heuristic |
| `SUPABASE_SERVICE_ROLE_KEY` ✅ | Registers humanized results as free derived texts; later webhooks/worker |
| `STRIPE_*` | Payments |
| `UPSTASH_*` | Rate limiting |
| Google OAuth client (in Supabase dashboard) | "Continue with Google" button |
