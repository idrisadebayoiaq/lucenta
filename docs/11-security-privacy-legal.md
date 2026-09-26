# 11 — Security, Privacy & Legal

## Security

### SSRF protection (critical — we fetch arbitrary user URLs)
- Allow only `http`/`https` schemes and ports 80/443.
- Resolve DNS **before** fetching and block private/reserved ranges: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16` (cloud metadata!), `::1`, `fc00::/7`, `fe80::/10`, `0.0.0.0`.
- Re-check on **every redirect** and pin the resolved IP for the request (prevents DNS rebinding).
- In Playwright, intercept all requests (`page.route`) and apply the same filter.
- Run workers in an isolated network with no access to internal services other than Supabase.

### General
- Secrets only in env vars / host secret managers; service-role key never shipped to the browser.
- RLS on every table; server writes use service role deliberately.
- Stripe + internal ML service calls verified with signatures/shared secrets.
- Input size limits on all endpoints (text length, file size ≤ 10 MB).
- Rate limiting (doc 06) + Cloudflare Turnstile captcha on anonymous usage.
- Sandboxed headless Chrome: fresh browser context per scan, no persistent storage, disable downloads.
- Dependency scanning (Dependabot / `npm audit` / `pip-audit`).

## Privacy
- **Text inputs are sensitive** (essays, business docs). Default: do **not** store input/output text beyond 24h unless the user turns on history.
- Never use user text to train models **unless the user explicitly opts in** (clear toggle in settings).
- Tell LLM providers not to retain data where possible (use zero-data-retention / API no-training defaults).
- "Delete all my data" button in settings (deletes rows + storage objects).
- Cookie consent banner for analytics (EU/UK users — GDPR/UK GDPR).
- Privacy policy lists all sub-processors (Supabase, Vercel, OpenAI/Anthropic, GPU host, Stripe, etc.).

## Legal & acceptable use
- **Terms of Service** + **Acceptable Use Policy**:
  - Users are responsible for how they use rewritten text and must follow the rules of their school, employer, or publisher.
  - No use of the humanizer for academic dishonesty, fraud, spam, impersonation, or misinformation.
  - No scanning of sites the user isn't allowed to test for abusive purposes; we respect `robots.txt` for crawls.
- **Marketing claims**: avoid "100% undetectable" or "bypass Turnitin" claims — they create legal/consumer-protection risk (misleading advertising) and platform issues (Stripe and ad networks restrict "academic cheating" positioning). Position the humanizer as a tool to make writing sound natural and match your voice, and back any detector claims with the published benchmark.
- **Detector disclaimer**: results are probabilistic and shouldn't be the sole basis for disciplinary decisions.
- **Third-party APIs**: review ToS of each detector used for benchmarking and each data source (Google APIs attribution requirements, dataset licenses for training data).
- **Crawling**: identify our bot with a clear User-Agent (`LucentaBot/1.0 (+https://lucenta.app/bot)`), throttle requests.
- Consult a lawyer before launch for ToS/Privacy Policy in your target markets.
