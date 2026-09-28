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
  - Loose anti-bot cap per network: `SIGNUP_MAX_ACCOUNTS_PER_IP` (default 20) per `SIGNUP_IP_WINDOW_DAYS` (default 1). An IP is shared by everyone on the same Wi-Fi, so it never enforces one-per-device. Private/localhost IPs are skipped.
  - New Google accounts from a blocked device/IP are deleted in `/auth/callback`. Logins record the device too.
- Env: `SIGNUP_HASH_SECRET` (keep it stable — changing it invalidates existing hashes).
- Browser fingerprint (migration 0010): `DeviceIdInput` also sends a SHA-256 fingerprint (screen, GPU, timezone, CPU cores, canvas). If a new account's fingerprint matches an existing account, it's linked in `quota_links` and they share one set of daily limits (`quota_group`, `claim_content`, `consume_daily_scan`, `get_daily_usage`). The dashboard tells linked users. To unlink wrongly matched strangers: `delete from quota_links where user_id = '…'`.
- Signup rejects disposable email domains (`disposable-email-domains`) and variations of an existing email (`normalize_email`: lower-case, strip `+tag`, ignore Gmail dots).
- Email provider still to choose (Brevo / Resend / Gmail SMTP) — Supabase's built-in sender only sends ~2 emails/hour, so production signup and password-reset emails need custom SMTP.

## Stage 11g — Onboarding: occupation & how you heard about us ✅
- `/onboarding` (replaces `/complete-profile`, which now redirects) asks for date of birth (if missing), occupation (10 options) and how the user heard about Lucenta (Cursor, X, Instagram, Facebook, ChatGPT, Claude, Ads, Other with a required description). Options live in `src/lib/onboarding.ts`; the shared UI is `src/components/about-you-fields.tsx`.
- Migration 0011 adds `profiles.occupation`, `occupation_updated_at`, `referral_source`, `referral_other`, `onboarded_at`, plus the `enforce_profile_rules` trigger: birth date must be 16+ and can't be changed once set; occupation can be changed at most once every 30 days, for everyone (`occupation_locked`; migration 0012 widened this from students only, so picking Student carries no extra penalty).
- Students can't use the Humanizer: hidden from nav, dashboard quick actions and the Detector's "Humanize" buttons, the page shows an explanation, and `/api/humanize` returns 403 `NOT_AVAILABLE_FOR_STUDENTS`.
- Existing users are sent to onboarding before the dashboard and can change their answers in Settings → About you.
- `completeOnboarding` re-runs the device, network and email guards for brand-new accounts that skipped the signup form (created directly via the Supabase API) and deletes blocked ones.
- Privacy Policy, Terms and Responsible Use updated.

## Stage 11h — Humanizer renamed to Rewriter, Suggestions mode for students ✅
- The Humanizer is now the **Rewriter** (`/dashboard/rewriter`; `/dashboard/humanizer` redirects). Internals keep their names: `lib/humanizer`, `text_checks.kind = 'humanize'`.
- Two modes in `rewriter-workspace.tsx` (text is shared between them):
  - **Suggestions** (`/api/suggest`, `lib/suggestions`): flags unclear, wordy, generic, repetitive or passive sentences and explains how to fix them. It never returns rewritten sentences: the prompt forbids it and `sanitize()` strips long quotes and "try: …" examples. Built-in checks (stock phrases, 35+ word sentences, passive voice, repeated openings) fill gaps and are the fallback when no LLM is configured. Saved as `kind = 'suggest'` (migration 0013). Uses one daily text.
  - **Rewrite** (`/api/rewrite`): the old humanizer engine. Not available to students (403 `NOT_AVAILABLE_FOR_STUDENTS`).
- Students see Suggestions only; everyone else defaults to Rewrite.
- No AI score after a rewrite: the before/after gauges and "Check AI score" button are gone (UI, API response and history). A disclosure note sits under every rewrite. History lists only show AI scores for detections.
- The Detector's button is now "Get writing suggestions" (opens Suggestions mode with the text).
- Marketing copy, tools list, legal pages and FAQ updated ("Make your writing clearer" instead of "sound human").
- Rewrite mode is the humanizer engine (non-students). Suggestions mode (students) puts robotic, AI-sounding sentences first (`robotic` category, from the heuristic detector's sentence scores) and explains what to change, so students humanize their own writing.

## Stage 11i — Freelancer profiles (developers and writers) ✅
- Anyone 18+ can create one public freelancer profile at `/dashboard/freelancer` as a **developer** or **content writer** (SEO, copy, books, scripts, ghostwriting, technical, social, email, business, editing, translation). Profile: photo, name, headline, bio, location, experience, languages, starting rate, up to 6 specialties, skills, up to 6 services, up to 6 gallery images with captions, contact details (at least one of email/WhatsApp/phone), portfolio/LinkedIn/X/Facebook/Instagram, and show/hide + "available" toggles.
- Stored in the existing `developers` table (migration 0015 adds `user_id`, `kind`, `specialties`, `languages`, `gallery`, `starting_rate`, `linkedin_url`, `is_verified`, `is_published`). RLS lets owners insert/update/delete their own row; the `protect_freelancer_fields` trigger enforces 18+ on insert and stops users changing `is_verified`, `is_owner`, `sort_order` or `user_id`. The "Verified" badge is only shown when an admin sets `is_verified`.
- Images go to the public `freelancers` bucket under `<user id>/`, downscaled to WebP in the browser. Saving deletes images no longer used; deleting the profile or the account deletes them all.
- Public directory `/freelancers` (All / Developers / Writers tabs, specialty filters) and full profile pages `/freelancers/[slug]` with gallery, services and contact buttons. `/developers` redirects to `/freelancers?type=developer`.
- Matching (`lib/freelancer-match.ts`): website reports rank developers by how well their specialties cover the weakest categories and issues (plus WordPress/Shopify from the detected tech stack). The Detector, Suggestions and Rewrite results show "Happy with this result?"; "Not really" classifies the text (script, fiction, SEO/blog, copy, email, social, technical, business, always editing) and suggests matching writers. Not shown to students (`canSeeWriterSuggestions`).
- Header announcement bar (`lib/announcements.ts`) with a "Set up yours" button, shown for 7 days from `startsAt` and dismissible. Update `startsAt` to the real launch date when deploying.
- Roadmap item "Developer accounts" moved from Coming soon to the available "Hire a freelancer" tool. Roadmap items can use `status: "in-development"` to show an "In development" badge.

## Stage 11j — Competitor comparison ✅
- `/dashboard/compare`: your site plus 1–3 competitors, mobile or desktop. `POST /api/comparisons` runs a normal website scan for every site in parallel (`runScan` in `lib/analyzer/run-scan.ts`, shared with `/api/scans`), so each site also appears in the Website Analyzer history with its full report.
- Limits: one daily audit per site actually scanned. Completed scans of the same URL and device from today (UTC) are reused for free, except on "Re-run" (`fresh: true`). The request is refused up front if there aren't enough audits left.
- If your own site fails, nothing is saved. If some competitors fail, the comparison is saved without them and the page lists why.
- Tables (migration 0016): `comparisons` (owner, `site_url`, device) and `comparison_sites` (position 0 = your site, `url`, `scan_id` set null if the scan is deleted). Owners can read, insert and delete their own rows.
- `/dashboard/compare/[id]` (`lib/analyzer/compare.ts`): rank and overall rings, a side-by-side table (overall, 7 categories, TTFB, page weight, requests, words, tech stack; best value highlighted), **Quick wins** (easy, medium/high-impact gaps), **Where you're ahead**, and **Where competitors beat you** (checks you warn/fail that at least one competitor passes, with the fix steps). Score changes are shown against the previous comparison of the same site and device.
- A "Compare" button on every website report pre-fills the form. "Delete all history" also deletes comparisons.
- Roadmap item "Competitor comparison" moved from Coming soon to the available tools.

## Keep-alive ✅
- `.github/workflows/keep-supabase-awake.yml` pings `rest/v1/developers` every hour so the free Supabase project isn't paused after 7 idle days. Needs repository secrets `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (set). Can be run manually from the Actions tab.
- GitHub disables scheduled workflows in public repos after 60 days without commits; re-enable it from the Actions tab if that happens.

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
