-- Quota counter: limit comes from the user's plan, amount must be positive.

create or replace function public.plan_limit(p_plan text, p_field text)
returns integer language sql immutable set search_path = '' as $$
  select case p_field
    when 'scans_used' then case p_plan when 'business' then 500 when 'pro' then 100 else 3 end
    when 'detect_words_used' then case p_plan when 'business' then 500000 when 'pro' then 100000 else 2000 end
    when 'humanize_words_used' then case p_plan when 'business' then 250000 when 'pro' then 50000 else 500 end
  end;
$$;

create or replace function public.increment_usage(p_field text, p_amount integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_period date := date_trunc('month', now())::date;
  v_plan text;
  v_limit integer;
  v_current integer;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if p_field not in ('scans_used', 'detect_words_used', 'humanize_words_used') then
    raise exception 'invalid usage field';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  select plan into v_plan from public.profiles where id = v_user;
  v_limit := public.plan_limit(coalesce(v_plan, 'free'), p_field);

  insert into public.usage (user_id, period_start) values (v_user, v_period) on conflict do nothing;
  execute format('select %I from public.usage where user_id = $1 and period_start = $2 for update', p_field)
    into v_current using v_user, v_period;
  if v_current + p_amount > v_limit then
    return false;
  end if;
  execute format('update public.usage set %I = %I + $1 where user_id = $2 and period_start = $3', p_field, p_field)
    using p_amount, v_user, v_period;
  return true;
end;
$$;

revoke execute on function public.increment_usage(text, integer) from public, anon;
grant execute on function public.increment_usage(text, integer) to authenticated;
