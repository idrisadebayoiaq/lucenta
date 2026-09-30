-- Document uploads: a long document is checked in parts, and each part uses one daily content slot.
-- Claims every part in one transaction so a document is either fully allowed or not charged at all.
-- Parts already claimed today stay free, the same rule as single texts.

create or replace function public.claim_contents_for(p_user uuid, p_hashes text[])
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_day date := (now() at time zone 'utc')::date;
  v_used int;
  v_new text[];
begin
  if p_user is null then
    raise exception 'not authenticated';
  end if;
  if coalesce(array_length(p_hashes, 1), 0) = 0 or array_length(p_hashes, 1) > 20 then
    raise exception 'invalid content hashes';
  end if;
  if exists (select 1 from unnest(p_hashes) h where h !~ '^[a-f0-9]{64}$') then
    raise exception 'invalid content hash';
  end if;
  v_owner := coalesce((select owner_id from public.quota_links where user_id = p_user), p_user);
  perform pg_advisory_xact_lock(hashtext('daily_contents:' || v_owner::text));

  select coalesce(array_agg(distinct h), '{}') into v_new from unnest(p_hashes) h
  where not exists (select 1 from public.daily_contents where user_id = p_user and day = v_day and content_hash = h);
  if cardinality(v_new) = 0 then
    return true;
  end if;

  select count(*) into v_used from public.daily_contents
  where user_id in (select public.quota_group(p_user)) and day = v_day and parent_hash is null;
  if v_used + cardinality(v_new) > 5 then
    return false;
  end if;

  insert into public.daily_contents (user_id, day, content_hash) select p_user, v_day, h from unnest(v_new) h;
  return true;
end;
$$;

revoke execute on function public.claim_contents_for(uuid, text[]) from public, anon, authenticated;
grant execute on function public.claim_contents_for(uuid, text[]) to service_role;

create or replace function public.claim_contents(p_hashes text[])
returns boolean language sql security definer set search_path = '' as $$
  select public.claim_contents_for((select auth.uid()), p_hashes);
$$;

revoke execute on function public.claim_contents(text[]) from public, anon;
grant execute on function public.claim_contents(text[]) to authenticated;
