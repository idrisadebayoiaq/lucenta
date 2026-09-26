-- Free-only launch: daily limits instead of paid plans, plus a public developer directory.
-- Limits must stay in sync with src/lib/limits.ts.

-- Daily text "contents" -------------------------------------------------------------
-- One row per distinct text a user detects or humanizes per UTC day. Humanized outputs
-- are stored as derived rows (parent_hash set) so checking them doesn't use a slot.
create table public.daily_contents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  parent_hash text check (parent_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique (user_id, day, content_hash)
);
create index daily_contents_user_day_idx on public.daily_contents (user_id, day);

alter table public.daily_contents enable row level security;
create policy "daily_contents: read own" on public.daily_contents for select to authenticated using ((select auth.uid()) = user_id);
grant select on public.daily_contents to authenticated;
grant all on public.daily_contents to service_role;

create or replace function public.claim_content(p_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_day date := (now() at time zone 'utc')::date;
  v_used int;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if p_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid content hash';
  end if;
  perform pg_advisory_xact_lock(hashtext('daily_contents:' || v_user::text));

  if exists (select 1 from public.daily_contents where user_id = v_user and day = v_day and content_hash = p_hash) then
    return true;
  end if;

  select count(*) into v_used from public.daily_contents where user_id = v_user and day = v_day and parent_hash is null;
  if v_used >= 5 then
    return false;
  end if;

  insert into public.daily_contents (user_id, day, content_hash) values (v_user, v_day, p_hash);
  return true;
end;
$$;

revoke execute on function public.claim_content(text) from public, anon;
grant execute on function public.claim_content(text) to authenticated;

-- Daily website scans ---------------------------------------------------------------
create table public.daily_scans (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  count int not null default 0,
  primary key (user_id, day)
);

alter table public.daily_scans enable row level security;
create policy "daily_scans: read own" on public.daily_scans for select to authenticated using ((select auth.uid()) = user_id);
grant select on public.daily_scans to authenticated;
grant all on public.daily_scans to service_role;

create or replace function public.consume_daily_scan()
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_day date := (now() at time zone 'utc')::date;
  v_count int;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  insert into public.daily_scans (user_id, day, count) values (v_user, v_day, 1)
  on conflict (user_id, day) do update set count = public.daily_scans.count + 1
    where public.daily_scans.count < 5
  returning count into v_count;
  return v_count is not null;
end;
$$;

revoke execute on function public.consume_daily_scan() from public, anon;
grant execute on function public.consume_daily_scan() to authenticated;

-- Developer directory -----------------------------------------------------------------
create table public.developers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  name text not null,
  headline text not null,
  bio text not null,
  location text,
  experience text,
  skills text[] not null default '{}',
  services jsonb not null default '[]',
  email text,
  whatsapp text,
  phone text,
  portfolio_url text,
  x_handle text,
  facebook_handle text,
  instagram_handle text,
  avatar_url text,
  is_owner boolean not null default false,
  is_available boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger developers_set_updated_at before update on public.developers
  for each row execute function public.set_updated_at();

alter table public.developers enable row level security;
create policy "developers: public read available" on public.developers for select to anon, authenticated using (is_available);
grant select on public.developers to anon, authenticated;
grant all on public.developers to service_role;

-- Developer profiles are added through the dashboard / SQL editor, not seeded here, so personal
-- contact details stay out of the repository.
