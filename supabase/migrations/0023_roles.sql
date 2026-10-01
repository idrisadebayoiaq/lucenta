-- Roles: every account is a member; admins and the super admin can see the user directory.
-- Only the super admin can make someone an admin (set_user_role). The super admin is granted by hand in SQL:
--   update public.profiles set role = 'super_admin' where id = '<user id>';
-- Profile photos are private: you can see a photo only if your role is at least the owner's role
-- (members see members, admins see admins and members, the super admin sees everyone).

alter table public.profiles
  add column role text not null default 'member' check (role in ('member', 'admin', 'super_admin'));
update public.profiles set role = 'admin' where is_admin;
alter table public.profiles drop column is_admin;
create unique index profiles_one_super_admin on public.profiles (role) where role = 'super_admin';

create or replace function public.protect_profile_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.role()) = 'authenticated' then
    new.plan = old.plan;
    new.stripe_customer_id = old.stripe_customer_id;
    new.email = old.email;
  end if;
  -- Roles only change through set_user_role(), which runs as the function owner.
  if current_user in ('authenticated', 'anon') then
    new.role = old.role;
  end if;
  return new;
end;
$$;

create or replace function public.role_rank(p_role text)
returns int language sql immutable set search_path = '' as $$
  select case p_role when 'super_admin' then 3 when 'admin' then 2 else 1 end;
$$;

create or replace function public.my_role()
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select role from public.profiles where id = (select auth.uid())), 'member');
$$;

-- p_owner is the first folder of a storage path, so it is text rather than uuid.
create or replace function public.can_view_avatar(p_owner text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (
    p_owner = (select auth.uid())::text
    or public.role_rank(public.my_role())
       >= public.role_rank(coalesce((select role from public.profiles where id::text = p_owner), 'member'))
  );
$$;

create or replace function public.set_user_role(p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.my_role() <> 'super_admin' then
    raise exception 'Only the super admin can change roles' using errcode = '42501';
  end if;
  if p_role not in ('member', 'admin') then
    raise exception 'Role must be member or admin' using errcode = '22023';
  end if;
  if p_user = (select auth.uid()) then
    raise exception 'You cannot change your own role' using errcode = '22023';
  end if;
  update public.profiles set role = p_role where id = p_user and role <> 'super_admin';
  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;
end;
$$;

-- The user directory for admins and the super admin. Photos the caller may not see come back as null.
create or replace function public.list_users()
returns table (
  id uuid, email text, full_name text, username text, avatar_url text, role text, plan text,
  occupation text, location text, created_at timestamptz, last_sign_in_at timestamptz, email_confirmed_at timestamptz
) language plpgsql stable security definer set search_path = '' as $$
declare
  v_rank int := public.role_rank(public.my_role());
begin
  if v_rank < 2 then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
    select p.id, p.email, p.full_name, p.username,
      case when p.id = (select auth.uid()) or v_rank >= public.role_rank(p.role) then p.avatar_url end,
      p.role, p.plan, p.occupation, p.location, p.created_at, u.last_sign_in_at, u.email_confirmed_at
    from public.profiles p
    join auth.users u on u.id = p.id
    order by public.role_rank(p.role) desc, p.created_at desc;
end;
$$;

revoke execute on function public.my_role() from public, anon;
revoke execute on function public.can_view_avatar(text) from public, anon;
revoke execute on function public.set_user_role(uuid, text) from public, anon;
revoke execute on function public.list_users() from public, anon;
grant execute on function public.my_role() to authenticated;
grant execute on function public.can_view_avatar(text) to authenticated;
grant execute on function public.set_user_role(uuid, text) to authenticated;
grant execute on function public.list_users() to authenticated;

-- Profile photos: private bucket, everyone manages their own folder, reads follow the role rule.
update storage.buckets set public = false where id = 'avatars';

drop policy if exists "avatars: users read own" on storage.objects;
drop policy if exists "avatars: users upload own" on storage.objects;
drop policy if exists "avatars: users update own" on storage.objects;
drop policy if exists "avatars: users delete own" on storage.objects;

create policy "avatars: read by role" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and public.can_view_avatar((storage.foldername(name))[1]));
create policy "avatars: users upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: users update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: users delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
