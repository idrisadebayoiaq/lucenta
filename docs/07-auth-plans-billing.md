# 07 — Auth, Plans & Billing

## Authentication (Supabase Auth)
- Email + password, magic link, **Google OAuth** (most users), optionally GitHub.
- On signup, a DB trigger creates the `profiles` row with `plan = 'free'`.
- Anonymous users can try a limited number of scans/detections (tracked by hashed IP + fingerprint cookie) to reduce friction; results prompt signup to save.

## Plans (starting proposal — tune after launch)

| | Free | Pro ($12–19/mo) | Business ($49–79/mo) |
|---|---|---|---|
| Website scans | 3 / month, single page | 100 / month, crawl up to 100 pages | 500 / month, crawl up to 500 pages |
| Scan history | 7 days | Unlimited | Unlimited |
| PDF export / share link | – | ✓ | ✓ + white-label |
| Scheduled monitoring | – | 3 sites weekly | 20 sites daily |
| AI detection | 2,000 words / month | 100k words / month | 500k words / month |
| Humanizer | 500 words / month | 50k words / month | 250k words / month |
| Max words per request | 500 | 3,000 | 10,000 |
| Humanizer modes | Standard only | All | All + priority queue |

Also offer **credit packs** (one-time purchase, e.g. 20k humanizer words) for users who don't want a subscription. Offer yearly billing at ~2 months free.

## Stripe integration
1. Create Products/Prices in Stripe for each plan (monthly + yearly) and credit packs.
2. `POST /api/billing/checkout` creates a Checkout Session with `client_reference_id = user.id`.
3. Webhook `/api/webhooks/stripe` handles:
   - `checkout.session.completed` → link `stripe_customer_id`, create subscription row / add credits.
   - `customer.subscription.updated` / `deleted` → update plan + status.
   - `invoice.payment_failed` → mark `past_due`, email the user.
4. Customer portal for upgrades, downgrades, cancellation, invoices.
5. Webhook handlers are idempotent (store processed event IDs).

## Quota enforcement
- Server-side only, before any expensive work: read `usage` for current period, compare against plan limits (in `packages/shared/plans.ts`), increment atomically with a Postgres function (`increment_usage(user_id, field, amount)`) that fails if the limit would be exceeded.
- Failed scans/humanizations refund the usage.

## What you need
- Stripe account (activate for live payments; needs business details and bank account).
- Google Cloud OAuth client (for Google sign-in) configured in Supabase.
- Resend account + verified sending domain for auth emails.
