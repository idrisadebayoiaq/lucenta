-- Self-serve freelancer profiles: developers and content writers can list themselves.
-- Specialty ids must stay in sync with src/lib/freelancers.ts.

alter table public.developers
  add column user_id uuid unique references auth.users (id) on delete cascade,
  add column kind text not null default 'developer' check (kind in ('developer', 'writer')),
  add column specialties text[] not null default '{}' check (cardinality(specialties) <= 6),
  add column languages text[] not null default '{}' check (cardinality(languages) <= 6),
  add column gallery jsonb not null default '[]' check (jsonb_typeof(gallery) = 'array' and jsonb_array_length(gallery) <= 6),
  add column starting_rate text check (char_length(starting_rate) <= 60),
  add column linkedin_url text,
  add column is_verified boolean not null default false,
  add column is_published boolean not null default true,
  add constraint developers_name_length check (char_length(name) between 2 and 80),
  add constraint developers_headline_length check (char_length(headline) between 3 and 80),
  add constraint developers_bio_length check (char_length(bio) between 30 and 1500),
  add constraint developers_skills_count check (cardinality(skills) <= 15),
  add constraint developers_services_count check (jsonb_typeof(services) = 'array' and jsonb_array_length(services) <= 6);

create index developers_kind_idx on public.developers (kind) where is_published;

-- The seeded listing was added by hand and is verified.
update public.developers
set is_verified = true,
    specialties = array['full_stack', 'frontend', 'backend', 'performance', 'technical_seo', 'mobile']
where user_id is null;

-- Visibility: is_published hides/shows a listing; is_available is just the "open to work" badge.
drop policy "developers: public read available" on public.developers;
create policy "developers: public read published" on public.developers for select to anon, authenticated
  using (is_published or user_id = (select auth.uid()));
create policy "developers: insert own" on public.developers for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "developers: update own" on public.developers for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "developers: delete own" on public.developers for delete to authenticated
  using (user_id = (select auth.uid()));
grant insert, update, delete on public.developers to authenticated;

-- Users can't verify themselves, reorder the directory or move a listing to another account,
-- and must be 18+ to offer paid services.
create or replace function public.protect_freelancer_fields()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_birth date;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    select birth_date into v_birth from public.profiles where id = new.user_id;
    if v_birth is null or v_birth > (current_date - interval '18 years')::date then
      raise exception 'You must be 18 or older to create a freelancer profile.' using errcode = 'P0001';
    end if;
    new.is_verified := false;
    new.is_owner := false;
    new.sort_order := 100;
  else
    new.user_id := old.user_id;
    new.is_verified := old.is_verified;
    new.is_owner := old.is_owner;
    new.sort_order := old.sort_order;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger developers_protect_fields before insert or update on public.developers
  for each row execute function public.protect_freelancer_fields();

-- Profile photos and gallery images, stored under <user id>/.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('freelancers', 'freelancers', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "freelancers: users read own" on storage.objects for select to authenticated
  using (bucket_id = 'freelancers' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "freelancers: users upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'freelancers' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "freelancers: users update own" on storage.objects for update to authenticated
  using (bucket_id = 'freelancers' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "freelancers: users delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'freelancers' and (storage.foldername(name))[1] = (select auth.uid())::text);
