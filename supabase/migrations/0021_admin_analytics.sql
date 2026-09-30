-- Admin analytics: an admin flag on profiles, first-party page views and real-user performance (Core Web Vitals),
-- and one server-only function that builds the admin dashboard.
-- Visitors are counted with a daily-rotating hash, so no cookies or personal data are stored.
-- Admins are granted by hand in SQL: update public.profiles set is_admin = true where id = '<user id>';

alter table public.profiles add column is_admin boolean not null default false;

create or replace function public.protect_profile_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.role()) = 'authenticated' then
    new.plan = old.plan;
    new.stripe_customer_id = old.stripe_customer_id;
    new.email = old.email;
    new.is_admin = old.is_admin;
  end if;
  return new;
end;
$$;

create table public.page_views (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  day date not null default (now() at time zone 'utc')::date,
  path text not null check (char_length(path) between 1 and 300),
  referrer text check (char_length(referrer) <= 200),
  visitor text not null check (visitor ~ '^[a-f0-9]{32}$'),
  country text check (country ~ '^[A-Z]{2}$'),
  device text not null check (device in ('mobile', 'tablet', 'desktop')),
  browser text not null check (char_length(browser) <= 30)
);
create index page_views_day_idx on public.page_views (day);

create table public.web_vitals (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  day date not null default (now() at time zone 'utc')::date,
  path text not null check (char_length(path) between 1 and 300),
  name text not null check (name in ('LCP', 'INP', 'CLS', 'FCP', 'TTFB')),
  value double precision not null check (value >= 0),
  rating text not null check (rating in ('good', 'needs-improvement', 'poor')),
  device text not null check (device in ('mobile', 'tablet', 'desktop'))
);
create index web_vitals_day_idx on public.web_vitals (day);

alter table public.page_views enable row level security;
alter table public.web_vitals enable row level security;
revoke all on public.page_views, public.web_vitals from anon, authenticated;
grant all on public.page_views, public.web_vitals to service_role;

create or replace function public.admin_overview(p_days int)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_from date;
begin
  if p_days is null or p_days < 1 or p_days > 365 then
    raise exception 'invalid range';
  end if;
  v_from := v_today - (p_days - 1);

  return jsonb_build_object(
    'from', v_from,
    'to', v_today,
    'series', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', d.day,
        'visitors', (select count(distinct visitor) from public.page_views where day = d.day),
        'views', (select count(*) from public.page_views where day = d.day),
        'signups', (select count(*) from public.profiles where (created_at at time zone 'utc')::date = d.day),
        'scans', (select count(*) from public.scans where (created_at at time zone 'utc')::date = d.day),
        'checks', (select count(*) from public.text_checks where (created_at at time zone 'utc')::date = d.day)
      ) order by d.day), '[]'::jsonb)
      from (select generate_series(v_from, v_today, interval '1 day')::date as day) d
    ),
    'pages', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select path, count(*) as views, count(distinct (day, visitor)) as visitors
        from public.page_views where day >= v_from
        group by path order by views desc limit 10
      ) t
    ),
    'referrers', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select coalesce(referrer, 'Direct') as name, count(distinct (day, visitor)) as visitors
        from public.page_views where day >= v_from
        group by 1 order by visitors desc limit 10
      ) t
    ),
    'countries', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select coalesce(country, '??') as name, count(distinct (day, visitor)) as visitors
        from public.page_views where day >= v_from
        group by 1 order by visitors desc limit 10
      ) t
    ),
    'devices', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select device as name, count(distinct (day, visitor)) as visitors
        from public.page_views where day >= v_from
        group by 1 order by visitors desc
      ) t
    ),
    'browsers', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select browser as name, count(distinct (day, visitor)) as visitors
        from public.page_views where day >= v_from
        group by 1 order by visitors desc limit 6
      ) t
    ),
    'vitals', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select name,
          percentile_cont(0.75) within group (order by value) as p75,
          count(*) as samples,
          count(*) filter (where rating = 'good') as good,
          count(*) filter (where rating = 'needs-improvement') as needs_improvement,
          count(*) filter (where rating = 'poor') as poor
        from public.web_vitals where day >= v_from
        group by name
      ) t
    ),
    'slow_pages', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select path, percentile_cont(0.75) within group (order by value) as lcp, count(*) as samples
        from public.web_vitals where day >= v_from and name = 'LCP'
        group by path order by lcp desc limit 8
      ) t
    ),
    'totals', jsonb_build_object(
      'users', (select count(*) from public.profiles),
      'signups', (select count(*) from public.profiles where created_at >= v_from),
      'scans', (select count(*) from public.scans where created_at >= v_from),
      'scans_failed', (select count(*) from public.scans where created_at >= v_from and status = 'failed'),
      'scan_seconds', (
        select round(avg(extract(epoch from (completed_at - created_at)))::numeric, 1)
        from public.scans where created_at >= v_from and status = 'completed' and completed_at is not null
      ),
      'checks', (select count(*) from public.text_checks where created_at >= v_from),
      'comparisons', (select count(*) from public.comparisons where created_at >= v_from),
      'api_requests', (select count(*) from public.api_requests where created_at >= v_from),
      'api_errors', (select count(*) from public.api_requests where created_at >= v_from and status >= 500),
      'api_ms', (select round(avg(duration_ms)) from public.api_requests where created_at >= v_from)
    )
  );
end;
$$;

revoke execute on function public.admin_overview(int) from public, anon, authenticated;
grant execute on function public.admin_overview(int) to service_role;
