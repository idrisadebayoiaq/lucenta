# 06 — API Specification

All endpoints are Next.js route handlers under `/api`. Auth via Supabase session cookie. All bodies validated with **zod**. Errors use:

```json
{ "error": { "code": "QUOTA_EXCEEDED", "message": "You've used all 3 free scans this month." } }
```

## Website analyzer

### `POST /api/scans`
Start a scan.
```json
// request
{ "url": "example.com", "device": "mobile", "depth": 1 }
// 202 response
{ "scanId": "uuid", "status": "queued" }
```
Errors: `INVALID_URL`, `BLOCKED_URL` (SSRF), `QUOTA_EXCEEDED`, `RATE_LIMITED`.

### `GET /api/scans/:id`
Returns status/progress, and the report when completed.
```json
{ "id": "uuid", "status": "running", "progress": 45, "stage": "Running Lighthouse" }
```
(Client should prefer Supabase Realtime subscription; this is the polling fallback.)

### `GET /api/scans`
List user's scans (paginated: `?cursor=&limit=20`).

### `POST /api/scans/:id/rescan`
Re-run with same settings; response like `POST /api/scans`.

### `POST /api/scans/:id/share` → `{ "shareUrl": "https://lucenta.app/r/abc123" }`

### `GET /api/scans/:id/pdf` → PDF download (paid plans).

### `GET /api/scans/compare?a=:id&b=:id` → diff of two reports.

## AI detector

### `POST /api/detect`
```json
// request
{ "text": "..." }            // or multipart with file
// 200 response — see doc 03 Part A output
```
Errors: `TEXT_TOO_SHORT` (< 80 words), `TEXT_TOO_LONG` (plan limit), `QUOTA_EXCEEDED`.

## Humanizer

### `POST /api/humanize`
```json
{ "text": "...", "tone": "standard", "strength": "balanced", "keepFormatting": true, "keepWords": ["Lucenta"] }
```
Response: **Server-Sent Events** stream:
```
event: progress   data: {"stage":"rewriting","pct":40}
event: chunk      data: {"text":"partial output..."}
event: done       data: {"text":"...", "aiScoreBefore":0.91, "aiScoreAfter":0.08, "similarity":0.9, "checkId":"uuid"}
```

## Account & billing
- `GET /api/me` — profile, plan, usage.
- `POST /api/billing/checkout` → `{ url }` Stripe Checkout session.
- `POST /api/billing/portal` → `{ url }` Stripe customer portal.
- `POST /api/webhooks/stripe` — Stripe webhook (signature verified).

## ML service (internal, not public)
Called only by the Next.js server with a shared secret header `X-Internal-Key`.
- `POST /detect` `{ text }` → detection result
- `POST /humanize` `{ text, tone, strength, keep... }` → SSE stream
- `GET /health`

## Rate limits (Upstash)
| Endpoint | Anonymous | Logged in |
|----------|-----------|-----------|
| `POST /api/scans` | 3/day per IP | 10/min |
| `POST /api/detect` | 5/day per IP | 30/min |
| `POST /api/humanize` | 2/day per IP | 20/min |
