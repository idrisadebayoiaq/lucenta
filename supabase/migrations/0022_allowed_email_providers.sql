-- Sign-ups (and email changes) must use a well-known email provider, so temporary inboxes can't create accounts
-- even by calling the Auth API directly. The app checks the same list first to show a friendly message
-- (apps/web/src/lib/email-domains.ts). OAuth sign-ins are verified by the provider and are not restricted.

create or replace function public.is_allowed_email(p_email text)
returns boolean language sql immutable set search_path = '' as $$
  select split_part(lower(trim(p_email)), '@', 2) = any (array[
    'gmail.com', 'googlemail.com',
    'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'live.com', 'live.co.uk', 'msn.com',
    'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'ymail.com', 'rocketmail.com',
    'icloud.com', 'me.com', 'mac.com',
    'proton.me', 'protonmail.com', 'pm.me',
    'aol.com', 'zoho.com', 'zohomail.com', 'gmx.com', 'gmx.net', 'mail.com', 'yandex.com',
    'tutanota.com', 'tuta.io', 'fastmail.com'
  ]);
$$;

create or replace function public.enforce_allowed_email()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- Only requests from Supabase Auth are checked; admins working in SQL are not.
  if current_user <> 'supabase_auth_admin' then
    return new;
  end if;
  if coalesce(new.raw_app_meta_data ->> 'provider', 'email') <> 'email' then
    return new;
  end if;
  if tg_op = 'INSERT' and new.email is not null and not public.is_allowed_email(new.email) then
    raise exception 'Please use an email from a well-known provider such as Gmail, Outlook, Yahoo, iCloud or Proton.'
      using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and new.email_change is not null and new.email_change <> ''
     and new.email_change is distinct from old.email_change and not public.is_allowed_email(new.email_change) then
    raise exception 'Please use an email from a well-known provider such as Gmail, Outlook, Yahoo, iCloud or Proton.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_allowed_email on auth.users;
create trigger enforce_allowed_email before insert or update on auth.users
for each row execute function public.enforce_allowed_email();

revoke execute on function public.enforce_allowed_email() from public, anon, authenticated;
