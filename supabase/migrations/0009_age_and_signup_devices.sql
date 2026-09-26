-- Date of birth (users must be 16+) and one-account-per-device enforcement.

alter table public.profiles add column if not exists birth_date date;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_birth text := new.raw_user_meta_data ->> 'birth_date';
begin
  insert into public.profiles (id, email, full_name, avatar_url, birth_date)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    case when v_birth ~ '^\d{4}-\d{2}-\d{2}$' then v_birth::date end
  );
  return new;
end;
$$;

-- Devices and networks that have created (or signed in to) an account. Only hashes are stored.
-- Rows outlive the account (user_id is nulled) so deleting an account doesn't free the device.
create table if not exists public.account_devices (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  device_hash text,
  ip_hash text,
  source text not null check (source in ('signup', 'google', 'login')),
  created_at timestamptz not null default now()
);

create index if not exists account_devices_device_idx on public.account_devices (device_hash);
create index if not exists account_devices_ip_idx on public.account_devices (ip_hash, created_at);
create index if not exists account_devices_user_idx on public.account_devices (user_id);

alter table public.account_devices enable row level security;
revoke all on public.account_devices from anon, authenticated;
grant all on public.account_devices to service_role;
