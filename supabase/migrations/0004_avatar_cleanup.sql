-- Storage rows can no longer be deleted with SQL; the app removes avatar files via
-- the Storage API before calling delete_current_user().

create policy "avatars: users read own" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create or replace function public.delete_current_user()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = v_user;
end;
$$;
