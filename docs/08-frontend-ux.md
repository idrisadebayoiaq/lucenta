# 08 — Frontend & UX

## Pages / routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page: hero with a single input that accepts either a URL (→ website scan) or text (→ AI check), feature sections, pricing teaser, FAQ |
| `/website-analyzer` | SEO landing page + scan input |
| `/ai-detector` | SEO landing page + detector tool |
| `/humanizer` | SEO landing page + humanizer tool |
| `/scan/[id]` | Live progress → full website report |
| `/r/[slug]` | Public shared report (read-only) |
| `/dashboard` | Recent scans, recent text checks, usage meters |
| `/dashboard/scans` | Scan history, compare two scans |
| `/dashboard/texts` | Detection / humanize history |
| `/pricing` | Plans, FAQ |
| `/settings` | Profile, billing, privacy (history on/off, delete data) |
| `/login`, `/signup` | Auth |
| `/legal/terms`, `/legal/privacy`, `/legal/acceptable-use` | Legal |
| `/blog` | Content marketing (drives organic traffic for "website speed test", "AI detector", etc.) |

## Website report layout
1. **Header**: URL, favicon, scan date, device toggle, Re-scan, Share, PDF buttons.
2. **Score overview**: big overall score ring + grade, 7 small category rings.
3. **Executive summary** (AI-written, 4–6 sentences).
4. **Fix these first**: top 5 recommendations as cards (impact/effort badges, expandable "How to fix" with platform-specific steps).
5. **Core Web Vitals** panel: LCP / INP / CLS / TTFB with good/needs-improvement/poor color bands; field vs lab toggle.
6. **What's missing** checklist (✗ items with one-line explanation).
7. **Category tabs**: Performance, SEO, Accessibility, Security, Best Practices, Mobile, Content — each lists every check with pass/warn/fail and details (e.g. list of broken links, oversized images with sizes).
8. **Screenshots**: mobile + desktop.
9. **Tech stack** chips.
10. **History chart** (score over time) if scanned before.

## Detector / Humanizer layout
- Two-pane editor: **input** (left) and **output** (right).
- Word counter + plan limit indicator.
- After detect: big percentage gauge, label, sentence highlights in the input pane, "Why?" signals list.
- "Humanize" button → controls (tone, strength, keep options) → streamed output on the right.
- Output shows: new AI score gauge, meaning-similarity score, **diff view** toggle, copy button, "Humanize again" (different variation).
- Upload .docx / .pdf / .txt.

## Design notes
- Clean, trustworthy look (think Vercel / Linear style), dark + light mode.
- Mobile-friendly; report sections collapse into accordions on small screens.
- Live progress during scans with the current stage label ("Checking security headers...") — makes the 30–60s wait feel fast.
- Empty states and skeleton loaders everywhere.
- Accessibility: our own site must score high on our own analyzer (good marketing too).

## Libraries
`next`, `react`, `tailwindcss`, `shadcn/ui`, `lucide-react`, `recharts`, `@supabase/ssr`, `@supabase/supabase-js`, `zod`, `react-hook-form`, `@tanstack/react-query`, `diff` (for diff view), `@react-pdf/renderer` or Playwright-based PDF generation.
