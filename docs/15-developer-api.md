# Developer API (v1)

Run website audits and AI detection from your own apps. Manage keys, the webhook and usage at `/dashboard/api`.

## Authentication

```
Authorization: Bearer lc_live_<32 characters>
```

- Keys are shown once when created. Only a SHA-256 hash is stored.
- Up to 5 active keys per account. Revoked keys stop working immediately.
- Keep keys on your server. Never ship them in browser or mobile code.

## Limits

- API requests share the account's daily limits with the dashboard: 5 website audits and 5 different texts per day, reset at midnight UTC.
- 60 requests per minute per account. Going over returns `429 RATE_LIMITED` with a `Retry-After` header.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/audits` | Run an audit and wait for the report (usually 20 to 60 seconds). Body: `{ "url": "example.com", "device": "mobile" \| "desktop" }`. Returns `201` with the audit and `report`, or `422 AUDIT_FAILED` if the site couldn't be scanned. |
| GET | `/api/v1/audits` | List audits, newest first. Query: `limit` (1 to 100, default 20), `before` (ISO date). Returns `{ data, has_more, next_before }`. |
| GET | `/api/v1/audits/{id}` | One audit, with `report` when it completed. |
| POST | `/api/v1/detect` | AI-likelihood of a text. Body: `{ "text": "...", "save": false }`. At least 80 words, up to 3,000 characters. `save: true` also adds it to the account's history (unless history is turned off). |
| GET | `/api/v1/usage` | `{ day, resets_at, audits: { used, limit }, texts: { used, limit }, rate_limit_per_minute }`. |

### Audit object

`id, url, device, status, score, grade, error, created_at, completed_at`, plus `report` on completed audits:
`final_url, page, summary, audience, strengths, categories{ <key>: { score, checks[] } }, fixes[], missing, metrics, tech_stack`.

### Detection object

`id, ai_probability (0 to 1), label, confidence, word_count, sentences[{ text, start, end, ai_probability }], signals, explanation`.

## Errors

```json
{ "error": { "code": "DAILY_LIMIT", "message": "..." } }
```

| Status | Codes |
| --- | --- |
| 400 | `INVALID_INPUT`, `INVALID_URL`, `TEXT_TOO_SHORT`, `TEXT_TOO_LONG` |
| 401 | `UNAUTHORIZED` (missing, malformed or revoked key) |
| 404 | `NOT_FOUND` |
| 422 | `AUDIT_FAILED` |
| 429 | `DAILY_LIMIT`, `RATE_LIMITED` |
| 500 | `INTERNAL_ERROR` |

## Webhooks

One https endpoint per account. After an API audit finishes, Lucenta POSTs:

```json
{ "event": "audit.completed", "created_at": "...", "data": { "id": "...", "url": "...", "score": 82, "...": "..." } }
```

Events: `audit.completed`, `audit.failed`, and `test` (from the dashboard's Send test button).

Headers: `Lucenta-Event`, and `Lucenta-Signature: t=<unix seconds>,v1=<hex>` where `v1` is the HMAC-SHA256 of `"<t>.<raw body>"` using the webhook's signing secret (`whsec_...`).

```js
import { createHmac, timingSafeEqual } from "node:crypto";

function verify(rawBody, header, secret) {
  const { t, v1 } = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return v1.length === expected.length && timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
}
```

Deliveries time out after 10 seconds, don't follow redirects and aren't retried. The last result shows on the dashboard.
