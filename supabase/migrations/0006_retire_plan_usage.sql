-- Paid plans were removed; daily limits now live in claim_content() / consume_daily_scan() (0005).
-- The old monthly counter RPC is no longer called by the app, so nobody should be able to execute it.
revoke execute on function public.increment_usage(text, integer) from authenticated;
