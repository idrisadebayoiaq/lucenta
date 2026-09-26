# 04 — Social Profile Analyzer (Deferred)

**Status: not in v1.** This doc exists so the v1 architecture leaves room for it.

## Planned scope
User pastes a profile URL or handle (Instagram, TikTok, X, LinkedIn, YouTube, Facebook page) and gets:
- Profile completeness: bio, profile photo, link in bio, category, contact button, highlights/pinned posts.
- Bio quality: clarity, keywords, CTA (LLM-assisted; can reuse AI detector on bio/captions).
- Engagement rate = (avg likes + comments) / followers, compared to benchmarks for that follower tier.
- Posting frequency & consistency, best posting times.
- Content mix (reels vs images vs carousels), top-performing posts.
- Hashtag usage.
- Follower growth trend (requires repeat snapshots over time).
- Fake-follower / audience quality signals (paid data providers).
- Recommendations list, same format as the website analyzer.

## Data access — the main challenge
| Option | Pros | Cons |
|--------|------|------|
| Official APIs (Instagram Graph API, YouTube Data API, X API, TikTok Display/Research API, LinkedIn API) | Legal, reliable | Most require the profile owner to log in via OAuth; X API is expensive; LinkedIn is very restricted |
| Third-party data providers (e.g. Phyllo, Modash, HypeAuditor, Apify actors, Data365) | Public profile data without owner login | Paid; review their ToS/compliance |
| Scraping directly | Cheap | Violates most platforms' ToS, fragile, legal risk — **not recommended** |

Recommended approach: **"Connect your account" via OAuth** for deep analytics of your own profile, plus a **third-party provider** for quick public checks of any handle.

## How v1 prepares for it
- `analyses` concept is generic: `scans` table has a `type` column (`website` now, `profile` later) — see doc 05.
- Recommendation format and report UI components are shared.
- Job queue + worker pattern is reusable.

## What will be needed later
- Meta developer app (Instagram Graph API) + app review.
- Google Cloud YouTube Data API key.
- TikTok developer account.
- X API plan (Basic or higher).
- A third-party social data provider account.
