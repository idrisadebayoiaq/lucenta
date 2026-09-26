# 05 — Database Schema (Supabase Postgres)

All tables live in `public`, have **Row Level Security enabled**, and reference `auth.users` for ownership. Migrations go in `supabase/migrations/`.

## Tables

### `profiles`
One row per user (created by trigger on signup).
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | = `auth.users.id` |
| full_name | text | |
| avatar_url | text | |
| plan | text | `free` \| `pro` \| `business` |
| stripe_customer_id | text | |
| created_at | timestamptz | default `now()` |

### `subscriptions`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK → profiles | |
| stripe_subscription_id | text unique | |
| plan | text | |
| status | text | `active`, `past_due`, `canceled`, ... |
| current_period_end | timestamptz | |

### `usage`
Tracks quota per billing period.
| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid FK | |
| period_start | date | |
| scans_used | int | |
| detect_words_used | int | |
| humanize_words_used | int | |
| PK | (user_id, period_start) | |

### `scans`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK, nullable | null = anonymous free scan (tracked by IP hash) |
| type | text | `website` (later `profile`) |
| url | text | normalized URL |
| device | text | `mobile` \| `desktop` |
| depth | int | pages to crawl |
| status | text | `queued`, `running`, `completed`, `failed` |
| stage | text | current step label for progress UI |
| progress | int | 0–100 |
| overall_score | int | |
| grade | text | |
| error | text | |
| is_public | bool | shareable link |
| share_slug | text unique | |
| created_at / completed_at | timestamptz | |

### `scan_results`
| Column | Type | Notes |
|--------|------|-------|
| scan_id | uuid PK FK → scans | |
| report | jsonb | full report (see doc 02) |
| lighthouse_raw | jsonb | optional, can be moved to Storage if large |

### `scan_pages` (multi-page crawls)
| scan_id | url | status_code | score | issues jsonb |

### `text_checks`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK nullable | |
| kind | text | `detect` \| `humanize` |
| input_text | text | stored only if user enables history (privacy — doc 11) |
| output_text | text | humanized result |
| word_count | int | |
| ai_score_before | numeric | |
| ai_score_after | numeric | |
| similarity | numeric | meaning preservation score |
| mode / strength | text | |
| result | jsonb | sentence scores etc. |
| created_at | timestamptz | |

### `benchmark_runs` (internal, admin only)
| id | run_at | detector | model_version | samples | pass_rate_20 | avg_score | details jsonb |

## Queue
- Enable `pgmq` extension; queue name `scan_jobs`.
- Web API: `select pgmq.send('scan_jobs', '{"scan_id": "..."}')`.
- Worker: `pgmq.read('scan_jobs', 120, 1)` (visibility timeout 120s) → process → `pgmq.delete`.

## RLS policies (summary)
- `profiles`, `usage`, `subscriptions`: user can `select` own row; writes only via service role (server/webhooks).
- `scans`, `scan_results`, `text_checks`: user can `select`/`delete` own rows; `insert` via server only. Public shared scans readable when `is_public = true` (via `share_slug` lookup in a security-definer function).
- `benchmark_runs`: service role only.

## Storage buckets
- `screenshots` (private; signed URLs) — mobile/desktop screenshots per scan.
- `reports` (private) — generated PDFs.
- `uploads` (private, auto-delete after 24h) — uploaded .docx/.pdf for detection.

## Indexes
- `scans (user_id, created_at desc)`
- `scans (url, created_at desc)` for cache lookup
- `text_checks (user_id, created_at desc)`
