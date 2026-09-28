-- Competitor comparison: your site next to up to 3 competitors, each backed by a normal website scan.
-- Position 0 is always the user's own site. URLs are copied so a comparison still makes sense
-- after one of its scans is deleted from the analyzer history.

create table public.comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  site_url text not null,
  device text not null default 'mobile' check (device in ('mobile', 'desktop')),
  created_at timestamptz not null default now()
);
create index comparisons_user_created_idx on public.comparisons (user_id, created_at desc);
create index comparisons_user_site_idx on public.comparisons (user_id, site_url, created_at desc);

create table public.comparison_sites (
  comparison_id uuid not null references public.comparisons (id) on delete cascade,
  position smallint not null check (position between 0 and 3),
  url text not null,
  scan_id uuid references public.scans (id) on delete set null,
  primary key (comparison_id, position)
);
create index comparison_sites_scan_idx on public.comparison_sites (scan_id);

alter table public.comparisons enable row level security;
alter table public.comparison_sites enable row level security;

create policy "comparisons: read own" on public.comparisons for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "comparisons: insert own" on public.comparisons for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "comparisons: delete own" on public.comparisons for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "comparison_sites: read via comparison" on public.comparison_sites for select to authenticated using (
  exists (select 1 from public.comparisons c where c.id = comparison_id and c.user_id = (select auth.uid())));
create policy "comparison_sites: insert via own comparison and scan" on public.comparison_sites for insert to authenticated with check (
  exists (select 1 from public.comparisons c where c.id = comparison_id and c.user_id = (select auth.uid()))
  and (scan_id is null or exists (select 1 from public.scans s where s.id = scan_id and s.user_id = (select auth.uid()))));

grant select, insert, delete on public.comparisons to authenticated;
grant select, insert on public.comparison_sites to authenticated;
