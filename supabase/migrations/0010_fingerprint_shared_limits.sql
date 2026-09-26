-- Browser fingerprints, shared daily limits for accounts on the same device, and email alias detection.

alter table public.account_devices add column if not exists fingerprint_hash text;
create index if not exists account_devices_fingerprint_idx on public.account_devices (fingerprint_hash);

-- Accounts created on a device whose fingerprint matches an existing account share that account's daily limits.
-- Not writable by users (no policies); rows are managed by the server with the service role.
create table if not exists public.quota_links (
  user_id uuid primary key references auth.users (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_id <> owner_id)
);
create index if not exists quota_links_owner_idx on public.quota_links (owner_id);
alter table public.quota_links enable row level security;
revoke all on public.quota_links from anon, authenticated;
grant all on public.quota_links to service_role;

-- Everyone sharing limits with p_user: the owner plus every account linked to it.
create or replace function public.quota_group(p_user uuid)
returns setof uuid language sql stable security definer set search_path = '' as $$
  with owner as (
    select coalesce((select owner_id from public.quota_links where user_id = p_user), p_user) as id
  )
  select id from owner
  union
  select user_id from public.quota_links where owner_id = (select id from owner);
$$;
revoke execute on function public.quota_group(uuid) from public, anon, authenticated;

create or replace function public.claim_content(p_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_owner uuid;
  v_day date := (now() at time zone 'utc')::date;
  v_used int;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if p_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid content hash';
  end if;
  v_owner := coalesce((select owner_id from public.quota_links where user_id = v_user), v_user);
  perform pg_advisory_xact_lock(hashtext('daily_contents:' || v_owner::text));

  if exists (select 1 from public.daily_contents where user_id = v_user and day = v_day and content_hash = p_hash) then
    return true;
  end if;

  select count(*) into v_used from public.daily_contents
  where user_id in (select public.quota_group(v_user)) and day = v_day and parent_hash is null;
  if v_used >= 5 then
    return false;
  end if;

  insert into public.daily_contents (user_id, day, content_hash) values (v_user, v_day, p_hash);
  return true;
end;
$$;

create or replace function public.consume_daily_scan()
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_owner uuid;
  v_day date := (now() at time zone 'utc')::date;
  v_used int;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  v_owner := coalesce((select owner_id from public.quota_links where user_id = v_user), v_user);
  perform pg_advisory_xact_lock(hashtext('daily_scans:' || v_owner::text));

  select coalesce(sum(count), 0) into v_used from public.daily_scans
  where user_id in (select public.quota_group(v_user)) and day = v_day;
  if v_used >= 5 then
    return false;
  end if;

  insert into public.daily_scans (user_id, day, count) values (v_user, v_day, 1)
  on conflict (user_id, day) do update set count = public.daily_scans.count + 1;
  return true;
end;
$$;

-- Today's usage for the caller's whole quota group, plus whether limits are shared.
create or replace function public.get_daily_usage()
returns table (contents_used int, scans_used int, shared boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_day date := (now() at time zone 'utc')::date;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  return query
  select
    (select count(*)::int from public.daily_contents
      where user_id in (select public.quota_group(v_user)) and day = v_day and parent_hash is null),
    (select coalesce(sum(count), 0)::int from public.daily_scans
      where user_id in (select public.quota_group(v_user)) and day = v_day),
    (select count(*) > 1 from public.quota_group(v_user));
end;
$$;
revoke execute on function public.get_daily_usage() from public, anon;
grant execute on function public.get_daily_usage() to authenticated;

-- Email normalisation: lower-case, drop "+tag", and ignore dots for Gmail.
create or replace function public.normalize_email(p_email text)
returns text language sql immutable set search_path = '' as $$
  select case
    when split_part(lower(p_email), '@', 2) in ('gmail.com', 'googlemail.com') then
      replace(split_part(split_part(lower(p_email), '@', 1), '+', 1), '.', '') || '@gmail.com'
    else
      split_part(split_part(lower(p_email), '@', 1), '+', 1) || '@' || split_part(lower(p_email), '@', 2)
  end;
$$;

create index if not exists profiles_normalized_email_idx on public.profiles (public.normalize_email(email));

create or replace function public.email_in_use(p_email text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where public.normalize_email(email) = public.normalize_email(p_email));
$$;
revoke execute on function public.email_in_use(text) from public, anon, authenticated;
grant execute on function public.email_in_use(text) to service_role;
