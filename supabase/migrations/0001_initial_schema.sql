-- Lucenta initial schema (applied to project pjjkbwtxkxtysamhnadp).

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles --------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  username text unique check (username ~ '^[a-z0-9_]{3,30}$'),
  avatar_url text,
  bio text check (char_length(bio) <= 500),
  company text,
  job_title text,
  website text,
  location text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  stripe_customer_id text unique,
  save_history boolean not null default true,
  email_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed after update of email on auth.users
for each row when (old.email is distinct from new.email)
execute function public.handle_user_email_change();

-- Users cannot change billing-controlled columns themselves.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.role()) = 'authenticated' then
    new.plan = old.plan;
    new.stripe_customer_id = old.stripe_customer_id;
    new.email = old.email;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_columns before update on public.profiles
for each row execute function public.protect_profile_columns();

-- subscriptions -----------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  stripe_subscription_id text unique,
  plan text not null check (plan in ('pro', 'business')),
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_user_id_idx on public.subscriptions (user_id);
create trigger subscriptions_updated_at before update on public.subscriptions
for each row execute function public.set_updated_at();

-- usage -------------------------------------------------------------------------
create table public.usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  period_start date not null,
  scans_used integer not null default 0,
  detect_words_used integer not null default 0,
  humanize_words_used integer not null default 0,
  primary key (user_id, period_start)
);

-- scans -------------------------------------------------------------------------
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  type text not null default 'website' check (type in ('website', 'profile')),
  url text not null,
  device text not null default 'mobile' check (device in ('mobile', 'desktop')),
  depth integer not null default 1 check (depth between 1 and 500),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  stage text,
  progress integer not null default 0 check (progress between 0 and 100),
  overall_score integer check (overall_score between 0 and 100),
  grade text,
  error text,
  is_public boolean not null default false,
  share_slug text unique,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index scans_user_created_idx on public.scans (user_id, created_at desc);
create index scans_url_created_idx on public.scans (url, created_at desc);

create table public.scan_results (
  scan_id uuid primary key references public.scans (id) on delete cascade,
  report jsonb not null,
  lighthouse_raw jsonb,
  created_at timestamptz not null default now()
);

create table public.scan_pages (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans (id) on delete cascade,
  url text not null,
  status_code integer,
  score integer,
  issues jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index scan_pages_scan_id_idx on public.scan_pages (scan_id);

-- text_checks -------------------------------------------------------------------
create table public.text_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('detect', 'humanize')),
  title text,
  input_text text,
  output_text text,
  word_count integer not null default 0,
  ai_score_before numeric(5, 4),
  ai_score_after numeric(5, 4),
  similarity numeric(5, 4),
  tone text,
  strength text,
  engine text,
  result jsonb,
  created_at timestamptz not null default now()
);
create index text_checks_user_created_idx on public.text_checks (user_id, created_at desc);

-- benchmark_runs (internal, service role only) ------------------------------------
create table public.benchmark_runs (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz not null default now(),
  detector text not null,
  model_version text not null,
  samples integer not null,
  pass_rate_20 numeric(5, 4),
  avg_score numeric(5, 4),
  details jsonb
);

-- account deletion --------------------------------------------------------------
create or replace function public.delete_current_user()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  delete from storage.objects where bucket_id = 'avatars' and (storage.foldername(name))[1] = v_user::text;
  delete from auth.users where id = v_user;
end;
$$;

revoke execute on function public.delete_current_user() from public, anon;
grant execute on function public.delete_current_user() to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;

-- RLS ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage enable row level security;
alter table public.scans enable row level security;
alter table public.scan_results enable row level security;
alter table public.scan_pages enable row level security;
alter table public.text_checks enable row level security;
alter table public.benchmark_runs enable row level security;

create policy "profiles: read own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: update own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "subscriptions: read own" on public.subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "usage: read own" on public.usage for select to authenticated using ((select auth.uid()) = user_id);

create policy "scans: read own or public" on public.scans for select to anon, authenticated using ((select auth.uid()) = user_id or is_public);
create policy "scans: insert own" on public.scans for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "scans: update own" on public.scans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "scans: delete own" on public.scans for delete to authenticated using ((select auth.uid()) = user_id);

create policy "scan_results: read via scan" on public.scan_results for select to anon, authenticated using (
  exists (select 1 from public.scans s where s.id = scan_id and (s.user_id = (select auth.uid()) or s.is_public)));
create policy "scan_results: insert via own scan" on public.scan_results for insert to authenticated with check (
  exists (select 1 from public.scans s where s.id = scan_id and s.user_id = (select auth.uid())));
create policy "scan_results: update via own scan" on public.scan_results for update to authenticated using (
  exists (select 1 from public.scans s where s.id = scan_id and s.user_id = (select auth.uid())));

create policy "scan_pages: read via scan" on public.scan_pages for select to authenticated using (
  exists (select 1 from public.scans s where s.id = scan_id and s.user_id = (select auth.uid())));

create policy "text_checks: read own" on public.text_checks for select to authenticated using ((select auth.uid()) = user_id);
create policy "text_checks: insert own" on public.text_checks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "text_checks: update own" on public.text_checks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "text_checks: delete own" on public.text_checks for delete to authenticated using ((select auth.uid()) = user_id);

-- storage -----------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('screenshots', 'screenshots', false, 10485760, array['image/png', 'image/jpeg', 'image/webp']),
  ('reports', 'reports', false, 20971520, array['application/pdf']),
  ('uploads', 'uploads', false, 10485760, null)
on conflict (id) do nothing;

create policy "avatars: users upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: users update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: users delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "private buckets: users read own" on storage.objects for select to authenticated
  using (bucket_id in ('screenshots', 'reports', 'uploads') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "uploads: users write own" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
