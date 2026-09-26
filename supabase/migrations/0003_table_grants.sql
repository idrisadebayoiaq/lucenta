-- New Supabase projects no longer auto-grant table privileges to the API roles.
-- RLS policies still decide which rows are visible; these grants only allow the
-- statement types each policy was written for.

grant usage on schema public to anon, authenticated, service_role;

grant select, update on public.profiles to authenticated;
grant select on public.subscriptions to authenticated;
grant select on public.usage to authenticated;
grant select, insert, update, delete on public.scans to authenticated;
grant select on public.scans to anon;
grant select, insert, update on public.scan_results to authenticated;
grant select on public.scan_results to anon;
grant select on public.scan_pages to authenticated;
grant select, insert, update, delete on public.text_checks to authenticated;

grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
