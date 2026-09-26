-- Onboarding: occupation (students can't use the Humanizer) and how the user heard about Lucenta.
-- Occupation and referral lists must stay in sync with src/lib/onboarding.ts.

alter table public.profiles
  add column if not exists occupation text check (occupation in (
    'student', 'educator', 'content_creator', 'marketer', 'writer',
    'business_owner', 'developer', 'designer', 'freelancer', 'other'
  )),
  add column if not exists occupation_updated_at timestamptz,
  add column if not exists referral_source text check (referral_source in (
    'cursor', 'x', 'instagram', 'facebook', 'chatgpt', 'claude', 'ads', 'other'
  )),
  add column if not exists referral_other text check (char_length(referral_other) <= 100),
  add column if not exists onboarded_at timestamptz;

alter table public.profiles drop constraint if exists profiles_referral_other_required;
alter table public.profiles add constraint profiles_referral_other_required
  check (referral_source is distinct from 'other' or char_length(trim(coalesce(referral_other, ''))) >= 2);

-- Rules enforced for every write, including direct API calls:
--   * date of birth must be 16+ and can't be changed once set;
--   * a student can't switch to another occupation within 30 days of choosing "student".
create or replace function public.enforce_profile_rules()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.birth_date is distinct from old.birth_date then
    if old.birth_date is not null then
      raise exception 'Your date of birth can''t be changed.' using errcode = 'P0001';
    end if;
    if new.birth_date > (current_date - interval '16 years')::date then
      raise exception 'You must be at least 16 years old to use Lucenta.' using errcode = 'P0001';
    end if;
  end if;

  if new.occupation is distinct from old.occupation then
    if old.occupation = 'student'
       and old.occupation_updated_at > now() - interval '30 days' then
      raise exception 'occupation_locked' using errcode = 'P0001';
    end if;
    new.occupation_updated_at := now();
  else
    new.occupation_updated_at := old.occupation_updated_at;
  end if;

  if new.referral_source is distinct from 'other' then
    new.referral_other := null;
  end if;

  return new;
end;
$$;

-- A birth date sent at signup is only kept if it's valid and 16+; otherwise onboarding asks again.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_birth text := new.raw_user_meta_data ->> 'birth_date';
  v_date date;
begin
  if v_birth ~ '^\d{4}-\d{2}-\d{2}$' then
    begin
      v_date := v_birth::date;
    exception when others then
      v_date := null;
    end;
    if v_date > (current_date - interval '16 years')::date then
      v_date := null;
    end if;
  end if;

  insert into public.profiles (id, email, full_name, avatar_url, birth_date)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    v_date
  );
  return new;
end;
$$;

-- Email variations check, optionally ignoring the user's own profile.
drop function if exists public.email_in_use(text);
create or replace function public.email_in_use(p_email text, p_exclude uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where public.normalize_email(email) = public.normalize_email(p_email)
      and (p_exclude is null or id <> p_exclude)
  );
$$;
revoke execute on function public.email_in_use(text, uuid) from public, anon, authenticated;
grant execute on function public.email_in_use(text, uuid) to service_role;

drop trigger if exists profiles_enforce_rules on public.profiles;
create trigger profiles_enforce_rules before update on public.profiles
for each row execute function public.enforce_profile_rules();
