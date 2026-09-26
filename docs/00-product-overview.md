# 00 — Product Overview

## Vision

One place where creators, marketers, freelancers, and small businesses can check the quality of what they publish: their **website** and their **written content**.

## Target users

| User | Main need |
|------|-----------|
| Small business owners | "Why is my site slow / not ranking, and what do I fix first?" |
| Freelance web devs & agencies | Quick client audits with a shareable/exportable report |
| Marketers & SEO people | SEO + performance metrics in one report, tracked over time |
| Writers, bloggers, content teams | Check whether content reads as AI-generated and make it sound natural |
| Non-native English writers | Make text read fluently and naturally |

## Core features (v1)

### 1. Website Analyzer
- Paste a URL → full audit in ~30–60 seconds.
- Categories: **Performance, SEO, Accessibility, Best Practices, Security, Mobile, Content, Tech stack**.
- Overall score (0–100) plus a score per category.
- "What's missing" checklist (e.g. no meta description, no sitemap, images not compressed, no HTTPS redirect).
- Prioritized recommendations: each with impact (high/med/low), effort (easy/med/hard), and step-by-step fix instructions.
- AI-written executive summary in plain English.
- Report history + re-scan to compare before/after.
- PDF export and shareable public link (paid).

### 2. AI Text Detector
- Paste text (or upload .txt/.docx/.pdf) → AI-likelihood percentage.
- Sentence-level highlighting (which sentences look AI-written).
- Breakdown signals: perplexity, burstiness, repetitive phrasing, "AI tell" words.
- Minimum length (~80 words) for a reliable result; UI warns below that.

### 3. Humanizer (Rewriter)
- One click "Humanize" on detected text, or paste directly.
- Modes: *Standard, Casual, Professional, Academic, Creative*; strength: *Light / Balanced / Aggressive*.
- Preserves meaning (checked automatically) and keeps names, numbers, quotes, citations intact.
- Re-runs our own detector on the output and shows the new score.
- Target: rewritten text scores **≤20% AI** on major third-party detectors (see doc 03 for how this is measured and why it's a target, not a guarantee).

### 4. Social Profile Analyzer — deferred
See [04-profile-analyzer.md](./04-profile-analyzer.md).

## Out of scope for v1
- Profile analyzer
- Browser extension
- Public API for third parties
- Team workspaces / multi-seat billing
- Languages other than English (detector + humanizer) — planned for later

## Success metrics
- Website report generated in < 60s for 95% of URLs.
- Humanizer: ≥ 90% of benchmark samples score ≤ 20% AI on each tracked detector (see doc 10).
- Meaning preservation: semantic similarity ≥ 0.85 between original and rewrite.
- Free → paid conversion ≥ 3%.
