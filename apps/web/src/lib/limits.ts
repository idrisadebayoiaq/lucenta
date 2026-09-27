// Must stay in sync with claim_content() and consume_daily_scan() in
// supabase/migrations/0005_free_daily_limits_and_developers.sql.
export const DAILY_CONTENT_LIMIT = 5;
export const DAILY_SCAN_LIMIT = 5;
export const MAX_TEXT_CHARS = 3000;

export const FREE_FEATURES = [
  `${DAILY_SCAN_LIMIT} AI website audits per day`,
  `${DAILY_CONTENT_LIMIT} texts per day for the AI Detector and Rewriter`,
  `Up to ${MAX_TEXT_CHARS.toLocaleString()} characters per text`,
  "Writing suggestions that explain what to improve",
  "All Rewriter tones and strengths",
  "Full history of your scans and checks",
];
