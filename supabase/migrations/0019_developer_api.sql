-- Developer API: API keys, a request log for the usage dashboard, and one webhook per account.
-- Keys are stored as SHA-256 hashes; the full key is shown once at creation.
-- All writes go through the server with the service role, so users can only read their own rows.

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  prefix text not null check (char_length(prefix) between 8 and 20),
  key_hash text not null unique check (key_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index api_keys_user_idx on public.api_keys (user_id, created_at desc);

create table public.api_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  key_id uuid references public.api_keys (id) on delete set null,
  method text not null,
  path text not null,
  status smallint not null,
  duration_ms integer not null default 0,
  created_at timestamptz not null default now()
);
create index api_requests_user_created_idx on public.api_requests (user_id, created_at desc);
create index api_requests_key_created_idx on public.api_requests (key_id, created_at desc);

create table public.api_webhooks (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  url text not null check (url ~ '^https://' and char_length(url) <= 2048),
  secret text not null check (secret ~ '^whsec_[A-Za-z0-9]{32}$'),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_status smallint,
  last_error text,
  last_delivered_at timestamptz
);

alter table public.api_keys enable row level security;
alter table public.api_requests enable row level security;
alter table public.api_webhooks enable row level security;

create policy "api_keys: read own" on public.api_keys for select to authenticated using ((select auth.uid()) = user_id);
create policy "api_requests: read own" on public.api_requests for select to authenticated using ((select auth.uid()) = user_id);
create policy "api_webhooks: read own" on public.api_webhooks for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.api_keys, public.api_requests, public.api_webhooks from anon, authenticated;
grant select (id, user_id, name, prefix, created_at, last_used_at, revoked_at) on public.api_keys to authenticated;
grant select on public.api_requests, public.api_webhooks to authenticated;
grant all on public.api_keys, public.api_requests, public.api_webhooks to service_role;

-- Daily limits for a given user, callable only by the server (API requests have no session).
-- The session-based functions below delegate to these so both paths share one quota.

create or replace function public.claim_content_for(p_user uuid, p_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_day date := (now() at time zone 'utc')::date;
  v_used int;
begin
  if p_user is null then
    raise exception 'not authenticated';
  end if;
  if p_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid content hash';
  end if;
  v_owner := coalesce((select owner_id from public.quota_links where user_id = p_user), p_user);
  perform pg_advisory_xact_lock(hashtext('daily_contents:' || v_owner::text));

  if exists (select 1 from public.daily_contents where user_id = p_user and day = v_day and content_hash = p_hash) then
    return true;
  end if;

  select count(*) into v_used from public.daily_contents
  where user_id in (select public.quota_group(p_user)) and day = v_day and parent_hash is null;
  if v_used >= 5 then
    return false;
  end if;

  insert into public.daily_contents (user_id, day, content_hash) values (p_user, v_day, p_hash);
  return true;
end;
$$;

create or replace function public.consume_daily_scan_for(p_user uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_day date := (now() at time zone 'utc')::date;
  v_used int;
begin
  if p_user is null then
    raise exception 'not authenticated';
  end if;
  v_owner := coalesce((select owner_id from public.quota_links where user_id = p_user), p_user);
  perform pg_advisory_xact_lock(hashtext('daily_scans:' || v_owner::text));

  select coalesce(sum(count), 0) into v_used from public.daily_scans
  where user_id in (select public.quota_group(p_user)) and day = v_day;
  if v_used >= 5 then
    return false;
  end if;

  insert into public.daily_scans (user_id, day, count) values (p_user, v_day, 1)
  on conflict (user_id, day) do update set count = public.daily_scans.count + 1;
  return true;
end;
$$;

create or replace function public.get_daily_usage_for(p_user uuid)
returns table (contents_used int, scans_used int, shared boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_day date := (now() at time zone 'utc')::date;
begin
  if p_user is null then
    raise exception 'not authenticated';
  end if;
  return query
  select
    (select count(*)::int from public.daily_contents
      where user_id in (select public.quota_group(p_user)) and day = v_day and parent_hash is null),
    (select coalesce(sum(count), 0)::int from public.daily_scans
      where user_id in (select public.quota_group(p_user)) and day = v_day),
    (select count(*) > 1 from public.quota_group(p_user));
end;
$$;

revoke execute on function public.claim_content_for(uuid, text) from public, anon, authenticated;
revoke execute on function public.consume_daily_scan_for(uuid) from public, anon, authenticated;
revoke execute on function public.get_daily_usage_for(uuid) from public, anon, authenticated;
grant execute on function public.claim_content_for(uuid, text) to service_role;
grant execute on function public.consume_daily_scan_for(uuid) to service_role;
grant execute on function public.get_daily_usage_for(uuid) to service_role;

create or replace function public.claim_content(p_hash text)
returns boolean language sql security definer set search_path = '' as $$
  select public.claim_content_for((select auth.uid()), p_hash);
$$;

create or replace function public.consume_daily_scan()
returns boolean language sql security definer set search_path = '' as $$
  select public.consume_daily_scan_for((select auth.uid()));
$$;

create or replace function public.get_daily_usage()
returns table (contents_used int, scans_used int, shared boolean)
language sql stable security definer set search_path = '' as $$
  select * from public.get_daily_usage_for((select auth.uid()));
$$;
